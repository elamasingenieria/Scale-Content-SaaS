import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugRequest {
  action: 'test_storage' | 'test_webhook' | 'get_video_requests' | 'simulate_webhook';
  request_id?: string;
  video_base64?: string; // For testing
  metadata?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, request_id, video_base64, metadata }: DebugRequest = await req.json();

    switch (action) {
      case 'get_video_requests': {
        // Get recent video requests with their assets
        const { data: requests, error } = await supabase
          .from('video_requests')
          .select(`
            id,
            user_id,
            status,
            created_at,
            updated_at,
            failure_count,
            failure_reason,
            last_webhook_received_at,
            video_request_assets (
              id,
              kind,
              path,
              metadata,
              created_at
            )
          `)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          data: requests,
          count: requests?.length || 0
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'test_storage': {
        if (!request_id) {
          throw new Error('request_id required for storage test');
        }

        // Get the video request first
        const { data: videoRequest, error: fetchError } = await supabase
          .from('video_requests')
          .select('user_id')
          .eq('id', request_id)
          .single();

        if (fetchError) throw fetchError;

        // Create test data (small base64 image as test)
        const testData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        const binaryData = Uint8Array.from(atob(testData), c => c.charCodeAt(0));
        
        const testPath = `${videoRequest.user_id}/debug/test_${Date.now()}.png`;

        // Test upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('artifacts')
          .upload(testPath, binaryData, {
            contentType: 'image/png',
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Test signed URL generation
        const { data: urlData, error: urlError } = await supabase.storage
          .from('artifacts')
          .createSignedUrl(testPath, 3600); // 1 hour

        if (urlError) throw urlError;

        // Clean up test file
        const { error: deleteError } = await supabase.storage
          .from('artifacts')
          .remove([testPath]);

        return new Response(JSON.stringify({
          success: true,
          test_results: {
            upload_successful: true,
            upload_path: testPath,
            signed_url_generated: !!urlData.signedUrl,
            signed_url: urlData.signedUrl,
            cleanup_successful: !deleteError
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'simulate_webhook': {
        if (!request_id) {
          throw new Error('request_id required for webhook simulation');
        }

        // Create a test payload
        const webhookPayload = {
          request_id,
          status: 'completed',
          video_base64: video_base64 || 'dGVzdCB2aWRlbyBkYXRh', // "test video data" in base64
          metadata: metadata || {
            duration: 30,
            format: 'mp4',
            resolution: '1920x1080'
          }
        };

        // Call our own webhook function
        const webhookUrl = `${supabaseUrl}/functions/v1/receive_video_webhook`;
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookPayload)
        });

        const webhookResult = await response.json();

        return new Response(JSON.stringify({
          success: true,
          webhook_response_status: response.status,
          webhook_response: webhookResult,
          test_payload: webhookPayload
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'test_webhook': {
        // Test webhook logging functionality
        const testLog = {
          direction: 'incoming',
          event_type: 'debug_test',
          status: 200,
          payload: { test: true, timestamp: Date.now() },
          response_data: { debug: 'test successful' },
          execution_time_ms: 100,
          request_size_bytes: 1024,
          idempotency_key: `debug_${Date.now()}`,
          request_id: 'debug-test'
        };

        const { data, error } = await supabase
          .from('webhook_logs')
          .insert(testLog)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({
          success: true,
          log_entry_created: data
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Debug webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});