import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface WebhookPayload {
  request_id: string;
  video_base64?: string;
  metadata?: {
    duration?: number;
    format?: string;
    resolution?: string;
  };
  status: 'completed' | 'failed';
  failure_reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: WebhookPayload = await req.json();
    console.log('Received webhook payload:', { 
      request_id: payload.request_id, 
      status: payload.status,
      has_video: !!payload.video_base64
    });

    // Validate required fields
    if (!payload.request_id || !payload.status) {
      console.error('Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get video request to validate it exists and get user_id
    const { data: videoRequest, error: fetchError } = await supabase
      .from('video_requests')
      .select('id, user_id, status')
      .eq('id', payload.request_id)
      .single();

    if (fetchError || !videoRequest) {
      console.error('Video request not found:', fetchError);
      return new Response(JSON.stringify({ error: 'Video request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.status === 'completed' && payload.video_base64) {
      // Convert base64 to binary
      const videoData = Uint8Array.from(atob(payload.video_base64), c => c.charCodeAt(0));
      
      // Create file path
      const fileName = `${payload.request_id}.mp4`;
      const filePath = `${videoRequest.user_id}/videos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(filePath, videoData, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading video:', uploadError);
        throw new Error('Failed to upload video');
      }

      // Update video request status to READY
      const { error: updateError } = await supabase
        .from('video_requests')
        .update({ 
          status: 'READY',
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.request_id);

      if (updateError) {
        console.error('Error updating video request:', updateError);
        throw new Error('Failed to update video request');
      }

      // Create video asset record
      const { error: assetError } = await supabase
        .from('video_request_assets')
        .insert({
          request_id: payload.request_id,
          kind: 'edited_video',
          path: filePath,
          metadata: payload.metadata || {}
        });

      if (assetError) {
        console.error('Error creating video asset:', assetError);
        // Don't throw here, the video is already uploaded
      }

      console.log('Video processed successfully:', {
        request_id: payload.request_id,
        file_path: filePath
      });

    } else if (payload.status === 'failed') {
      // Update video request status to FAILED
      const { error: updateError } = await supabase
        .from('video_requests')
        .update({ 
          status: 'FAILED',
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.request_id);

      if (updateError) {
        console.error('Error updating failed video request:', updateError);
        throw new Error('Failed to update video request');
      }

      console.log('Video request marked as failed:', {
        request_id: payload.request_id,
        reason: payload.failure_reason
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      request_id: payload.request_id,
      status: payload.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});