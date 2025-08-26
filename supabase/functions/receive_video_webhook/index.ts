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

// Helper function to log webhook calls
async function logWebhookCall(
  supabase: any,
  direction: 'incoming' | 'outgoing',
  eventType: string,
  status: number,
  payload: any,
  responseData?: any,
  error?: string,
  executionTimeMs?: number,
  requestSizeBytes?: number
) {
  try {
    await supabase.from('webhook_logs').insert({
      direction,
      event_type: eventType,
      status,
      payload,
      response_data: responseData,
      error,
      execution_time_ms: executionTimeMs,
      request_size_bytes: requestSizeBytes,
      idempotency_key: payload?.request_id,
      request_id: payload?.request_id
    });
  } catch (logError) {
    console.error('Failed to log webhook call:', logError);
  }
}

// Helper function to validate base64 video data
function validateBase64Video(base64String: string): { valid: boolean; error?: string; sizeBytes?: number } {
  try {
    if (!base64String || base64String.length === 0) {
      return { valid: false, error: 'Empty base64 string' };
    }

    // Basic base64 validation
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(base64String)) {
      return { valid: false, error: 'Invalid base64 format' };
    }

    // Estimate size in bytes (base64 is ~33% larger than binary)
    const sizeBytes = Math.floor(base64String.length * 0.75);
    
    // Check if size is reasonable (max 100MB for video)
    const maxSizeBytes = 100 * 1024 * 1024; // 100MB
    if (sizeBytes > maxSizeBytes) {
      return { valid: false, error: `Video too large: ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds 100MB limit` };
    }

    return { valid: true, sizeBytes };
  } catch (error) {
    return { valid: false, error: `Base64 validation error: ${error.message}` };
  }
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let payload: WebhookPayload;
  let supabase: any;
  
  try {
    console.log(`[${requestId}] Starting webhook processing`);
    
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body with size tracking
    const rawBody = await req.text();
    const requestSizeBytes = new TextEncoder().encode(rawBody).length;
    
    console.log(`[${requestId}] Request size: ${Math.round(requestSizeBytes / 1024)}KB`);
    
    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch (parseError) {
      console.error(`[${requestId}] JSON parse error:`, parseError);
      throw new Error('Invalid JSON payload');
    }
    
    console.log(`[${requestId}] Webhook payload parsed:`, { 
      request_id: payload.request_id, 
      status: payload.status,
      has_video: !!payload.video_base64,
      video_size_estimate: payload.video_base64 ? `${Math.round(payload.video_base64.length * 0.75 / 1024)}KB` : 'N/A'
    });

    // Log incoming webhook
    await logWebhookCall(
      supabase, 
      'incoming', 
      'video_status_update', 
      200, 
      payload, 
      null, 
      null, 
      null, 
      requestSizeBytes
    );

    // Validate required fields
    if (!payload.request_id || !payload.status) {
      const error = 'Missing required fields: request_id or status';
      console.error(`[${requestId}] ${error}`);
      
      await logWebhookCall(supabase, 'incoming', 'video_status_update', 400, payload, null, error);
      
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${requestId}] Validating video request exists...`);

    // Get video request to validate it exists and get user_id
    const { data: videoRequest, error: fetchError } = await supabase
      .from('video_requests')
      .select('id, user_id, status, failure_count')
      .eq('id', payload.request_id)
      .single();

    if (fetchError || !videoRequest) {
      const error = `Video request not found: ${payload.request_id}`;
      console.error(`[${requestId}] ${error}`, fetchError);
      
      await logWebhookCall(supabase, 'incoming', 'video_status_update', 404, payload, null, error);
      
      return new Response(JSON.stringify({ error: 'Video request not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${requestId}] Video request found:`, {
      id: videoRequest.id,
      user_id: videoRequest.user_id,
      current_status: videoRequest.status,
      failure_count: videoRequest.failure_count
    });

    if (payload.status === 'completed' && payload.video_base64) {
      console.log(`[${requestId}] Processing completed video...`);
      
      // Validate base64 video data
      const validation = validateBase64Video(payload.video_base64);
      if (!validation.valid) {
        const error = `Invalid video data: ${validation.error}`;
        console.error(`[${requestId}] ${error}`);
        
        // Update failure count
        await supabase.from('video_requests').update({
          failure_count: (videoRequest.failure_count || 0) + 1,
          failure_reason: error,
          last_webhook_received_at: new Date().toISOString()
        }).eq('id', payload.request_id);
        
        throw new Error(error);
      }

      console.log(`[${requestId}] Base64 validation passed, video size: ${Math.round(validation.sizeBytes! / 1024)}KB`);

      // Convert base64 to binary with error handling
      let videoData: Uint8Array;
      try {
        videoData = Uint8Array.from(atob(payload.video_base64), c => c.charCodeAt(0));
        console.log(`[${requestId}] Base64 conversion successful, binary size: ${videoData.length} bytes`);
      } catch (conversionError) {
        const error = `Base64 conversion failed: ${conversionError.message}`;
        console.error(`[${requestId}] ${error}`);
        throw new Error(error);
      }
      
      // Create file path
      const fileName = `${payload.request_id}.mp4`;
      const filePath = `${videoRequest.user_id}/videos/${fileName}`;

      console.log(`[${requestId}] Uploading to storage path: ${filePath}`);

      // Upload to Supabase Storage with retry logic
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('artifacts')
        .upload(filePath, videoData, {
          contentType: 'video/mp4',
          upsert: true
        });

      if (uploadError) {
        const error = `Storage upload failed: ${uploadError.message}`;
        console.error(`[${requestId}] ${error}`, uploadError);
        
        // Update failure count
        await supabase.from('video_requests').update({
          failure_count: (videoRequest.failure_count || 0) + 1,
          failure_reason: error,
          last_webhook_received_at: new Date().toISOString()
        }).eq('id', payload.request_id);
        
        throw new Error(error);
      }

      console.log(`[${requestId}] Video uploaded successfully:`, uploadData);

      // Update video request status to READY with all tracking fields
      const { error: updateError } = await supabase
        .from('video_requests')
        .update({ 
          status: 'READY',
          updated_at: new Date().toISOString(),
          last_webhook_received_at: new Date().toISOString(),
          failure_reason: null // Clear any previous failure reason
        })
        .eq('id', payload.request_id);

      if (updateError) {
        const error = `Failed to update video request status: ${updateError.message}`;
        console.error(`[${requestId}] ${error}`, updateError);
        throw new Error(error);
      }

      console.log(`[${requestId}] Video request status updated to READY`);

      // Create video asset record
      const { data: assetData, error: assetError } = await supabase
        .from('video_request_assets')
        .insert({
          request_id: payload.request_id,
          kind: 'edited_video',
          path: filePath,
          metadata: {
            ...payload.metadata,
            file_size_bytes: videoData.length,
            uploaded_at: new Date().toISOString()
          }
        });

      if (assetError) {
        console.error(`[${requestId}] Error creating video asset:`, assetError);
        // Don't throw here, the video is already uploaded successfully
      } else {
        console.log(`[${requestId}] Video asset created:`, assetData);
      }

      console.log(`[${requestId}] Video processed successfully:`, {
        request_id: payload.request_id,
        file_path: filePath,
        size_bytes: videoData.length
      });

    } else if (payload.status === 'failed') {
      console.log(`[${requestId}] Processing failed video request...`);
      
      // Update video request status to FAILED with tracking
      const { error: updateError } = await supabase
        .from('video_requests')
        .update({ 
          status: 'FAILED',
          updated_at: new Date().toISOString(),
          last_webhook_received_at: new Date().toISOString(),
          failure_count: (videoRequest.failure_count || 0) + 1,
          failure_reason: payload.failure_reason || 'No specific reason provided'
        })
        .eq('id', payload.request_id);

      if (updateError) {
        const error = `Failed to update video request to FAILED: ${updateError.message}`;
        console.error(`[${requestId}] ${error}`, updateError);
        throw new Error(error);
      }

      console.log(`[${requestId}] Video request marked as failed:`, {
        request_id: payload.request_id,
        reason: payload.failure_reason,
        failure_count: (videoRequest.failure_count || 0) + 1
      });
    } else {
      console.log(`[${requestId}] Unsupported status or missing video data:`, {
        status: payload.status,
        has_video: !!payload.video_base64
      });
    }

    const executionTime = Date.now() - startTime;
    console.log(`[${requestId}] Webhook processing completed successfully in ${executionTime}ms`);

    // Log successful completion
    await logWebhookCall(
      supabase, 
      'incoming', 
      'video_status_update', 
      200, 
      payload, 
      { success: true, request_id: payload.request_id, status: payload.status }, 
      null, 
      executionTime,
      requestSizeBytes
    );

    return new Response(JSON.stringify({ 
      success: true, 
      request_id: payload.request_id,
      status: payload.status,
      execution_time_ms: executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error.message || 'Internal server error';
    
    console.error(`[${requestId}] Error processing webhook (${executionTime}ms):`, error);

    // Log error if we have supabase connection
    if (supabase && payload) {
      await logWebhookCall(
        supabase, 
        'incoming', 
        'video_status_update', 
        500, 
        payload, 
        null, 
        errorMessage, 
        executionTime
      );
    }

    return new Response(JSON.stringify({ 
      error: errorMessage,
      request_id: payload?.request_id || 'unknown',
      execution_time_ms: executionTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});