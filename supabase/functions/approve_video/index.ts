import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

interface ApprovalRequest {
  requestId: string;
  action: 'approved' | 'rejected';
  rejectionReason?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requestId, action, rejectionReason }: ApprovalRequest = await req.json();
    
    if (!requestId || !action) {
      throw new Error('requestId and action are required');
    }

    if (!['approved', 'rejected'].includes(action)) {
      throw new Error('action must be "approved" or "rejected"');
    }

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Processing ${action} for video request ${requestId} by user ${user.id}`);

    // Get video request with full details including user profile and assets
    const { data: videoRequest, error: fetchError } = await supabase
      .from('video_requests')
      .select(`
        *,
        profiles!inner(id, email, display_name, avatar_url),
        video_request_assets(*)
      `)
      .eq('id', requestId)
      .single();

    if (fetchError || !videoRequest) {
      console.error('Video request not found:', fetchError);
      throw new Error('Video request not found');
    }

    // Verify user owns this video request
    if (videoRequest.user_id !== user.id) {
      throw new Error('You can only approve your own video requests');
    }

    // Verify video is in correct state for approval
    if (videoRequest.pre_approval_status !== 'pending') {
      throw new Error(`Video request is already ${videoRequest.pre_approval_status}`);
    }

    // Update video request status
    const updateData = {
      pre_approval_status: action,
      pre_approved_at: new Date().toISOString(),
      pre_approved_by: user.id,
      ...(action === 'rejected' && rejectionReason && { rejection_reason: rejectionReason })
    };

    const { error: updateError } = await supabase
      .from('video_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('Failed to update video request:', updateError);
      throw new Error('Failed to update video request status');
    }

    console.log(`Successfully updated video request ${requestId} to ${action}`);

    // Send webhook to N8n with approval data
    const n8nWebhookUrl = Deno.env.get('N8N_VIDEO_APPROVAL_WEBHOOK_URL');
    
    if (n8nWebhookUrl) {
      const webhookPayload = {
        action,
        video_request: {
          id: videoRequest.id,
          user_id: videoRequest.user_id,
          status: videoRequest.status,
          created_at: videoRequest.created_at,
          updated_at: videoRequest.updated_at,
          assets: videoRequest.video_request_assets || [],
          user_profile: videoRequest.profiles
        },
        approval_data: {
          approved_by: user.id,
          approved_at: updateData.pre_approved_at,
          ...(rejectionReason && { rejection_reason: rejectionReason })
        }
      };

      console.log('Sending webhook to N8n:', n8nWebhookUrl);

      try {
        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.error('N8n webhook failed:', await webhookResponse.text());
        } else {
          console.log('Successfully sent webhook to N8n');
        }
      } catch (webhookError) {
        console.error('Error sending webhook to N8n:', webhookError);
        // Don't fail the main operation if webhook fails
      }
    } else {
      console.warn('N8N_VIDEO_APPROVAL_WEBHOOK_URL not configured, skipping webhook');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Video ${action} successfully`,
        requestId,
        action,
        timestamp: updateData.pre_approved_at
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error('Error in approve_video function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
};

serve(handler);