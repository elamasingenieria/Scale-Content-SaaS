import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, idempotency-key',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, modalData, ugcData, brandingAssets } = await req.json();
    const idempotencyKey = req.headers.get('Idempotency-Key');

    if (!userId || !modalData || !ugcData) {
      throw new Error('Datos requeridos faltantes');
    }

    if (!idempotencyKey) {
      throw new Error('Idempotency-Key es requerida');
    }

    console.log(`Processing video request batch for user ${userId}, count: ${modalData.videoCount}`);

    // Create batch of video requests with atomic credit deduction
    const { data: result, error } = await supabase.rpc('rpc_create_video_batch', {
      p_user_id: userId,
      p_video_count: modalData.videoCount,
      p_custom_instructions: modalData.customInstructions,
      p_ugc_data: ugcData,
      p_branding_assets: brandingAssets,
      p_idempotency_key: idempotencyKey
    });

    if (error) {
      console.error('Error creating video batch:', error);
      
      // Handle specific error cases
      if (error.message?.includes('Saldo insuficiente')) {
        throw new Error(error.message);
      } else if (error.message?.includes('duplicada')) {
        throw new Error('Solicitud duplicada detectada');
      } else {
        throw new Error('Error al procesar la solicitud. Sus créditos no fueron deducidos.');
      }
    }

    console.log('Successfully created video batch:', result);

    // Send data to n8n webhook (fire-and-forget)
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      // Still return success since credits were deducted and video request created
      return new Response(JSON.stringify({ 
        success: true, 
        batch_id: result.batch_id,
        requests: result.request_ids,
        message: `Se crearon ${modalData.videoCount} solicitudes de video correctamente (webhook no configurado)`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const n8nPayload = {
      idempotency_key: idempotencyKey,
      request_id: result.batch_id,
      user_id: userId,
      branding: {
        logo_url: brandingAssets.find((asset: any) => asset.type === 'logo')?.signed_url,
        palette: brandingAssets.find((asset: any) => asset.type === 'logo')?.metadata?.palette
      },
      brolls: brandingAssets.filter((asset: any) => asset.type === 'broll' || asset.type === 'b-roll').map((asset: any) => asset.signed_url),
      ugc_brief: ugcData,
      video_generation: {
        video_count: modalData.videoCount,
        custom_instructions: modalData.customInstructions,
        batch_id: result.batch_id
      },
      constraints: {
        duration_sec: parseDuration(ugcData.video_duration),
        ratio: parseRatio(ugcData.recording_formats)
      },
      webhook_url: webhookUrl,
      created_at: new Date().toISOString()
    };

    // Send to n8n (don't await to avoid blocking the response)
    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Contract-Version': '1',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(n8nPayload),
    }).catch(err => {
      console.error('Error sending to n8n webhook:', err);
    });

    return new Response(JSON.stringify({ 
      success: true, 
      batch_id: result.batch_id,
      requests: result.request_ids,
      message: `Se crearon ${modalData.videoCount} solicitudes de video correctamente`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in create_video_request function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Error interno del servidor'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Parse duration from UGC form to seconds
 */
function parseDuration(duration: string): number {
  const durationMap: Record<string, number> = {
    '15s': 15,
    '30s': 30,
    '60s': 60,
    '90s': 90,
    'custom': 60 // Default fallback
  };
  return durationMap[duration] || 60;
}

/**
 * Parse ratio from recording formats
 */
function parseRatio(formats: string[] | null): string {
  if (!formats || formats.length === 0) return '16:9';
  
  // Check if vertical formats are selected
  if (formats.includes('Vertical (9:16)') || formats.includes('TikTok/Instagram Stories')) {
    return '9:16';
  }
  
  // Check if square format is selected
  if (formats.includes('Square (1:1)') || formats.includes('Instagram Feed')) {
    return '1:1';
  }
  
  // Default to horizontal
  return '16:9';
}