import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface VideoGenerationModalData {
  videoCount: number;
  customInstructions: string;
}

export interface BrandingAsset {
  id: string;
  type: string;
  storage_path: string;
  signed_url: string;
  metadata?: any;
}

export interface UGCFormData {
  id: string;
  client_name: string;
  cantidad_creadores: number;
  video_duration: string;
  video_duration_other?: string;
  product_display_timing?: string;
  recording_formats?: string[];
  recording_formats_other?: string;
  existing_script_links?: string;
  delivery_deadline?: string;
  especificaciones_creadores?: string;
  app_parts_to_show?: string;
  recording_locations?: string;
  creator_clothing?: string;
  creator_clothing_other?: string;
  creator_appearance_style?: string;
  creator_appearance_style_other?: string;
  creator_activity_while_talking?: string;
  app_display_method?: string;
  script_adherence?: string;
  creator_speech_style?: string;
  brand_pronunciation_guide?: string;
  main_objective?: string;
  key_message?: string;
  brand_values?: string;
  target_audience?: string;
  product_or_service?: string;
  key_features_benefits?: string;
  technical_details?: string;
  video_tone?: string;
  reference_ugc_videos?: string;
  call_to_action?: string;
  competitive_differentiators?: string;
  additional_details?: string;
}

export interface N8NPayload {
  idempotency_key: string;
  request_id: string;
  user_id: string;
  branding: {
    logo_url?: string;
    palette?: any;
  };
  brolls: string[];
  ugc_brief: {
    client_name: string;
    cantidad_creadores: number;
    especificaciones_creadores?: string;
    video_duration: string;
    video_duration_other?: string;
    product_display_timing?: string;
    recording_formats?: string[];
    recording_formats_other?: string;
    existing_script_links?: string;
    delivery_deadline?: string;
    app_parts_to_show?: string;
    recording_locations?: string;
    creator_clothing?: string;
    creator_clothing_other?: string;
    creator_appearance_style?: string;
    creator_appearance_style_other?: string;
    creator_activity_while_talking?: string;
    app_display_method?: string;
    script_adherence?: string;
    creator_speech_style?: string;
    brand_pronunciation_guide?: string;
    main_objective?: string;
    key_message?: string;
    brand_values?: string;
    target_audience?: string;
    product_or_service?: string;
    key_features_benefits?: string;
    technical_details?: string;
    video_tone?: string;
    reference_ugc_videos?: string;
    call_to_action?: string;
    competitive_differentiators?: string;
    additional_details?: string;
  };
  video_generation: {
    video_count: number;
    custom_instructions: string;
    batch_id: string;
  };
  constraints: {
    duration_sec: number;
    ratio: string;
  };
  webhook_url: string;
  created_at: string;
}

/**
 * Get branding assets for a user with signed URLs for access
 */
export async function getBrandingAssetsWithSignedUrls(userId: string): Promise<BrandingAsset[]> {
  try {
    // Fetch branding assets from database
    const { data: assets, error } = await supabase
      .from('branding_assets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!assets || assets.length === 0) {
      return [];
    }

    // Generate signed URLs for each asset
    const assetsWithSignedUrls: BrandingAsset[] = [];

    for (const asset of assets) {
      try {
        // Extract bucket and path from storage_path
        const pathParts = asset.storage_path.split('/');
        const bucket = pathParts[0]; // 'branding' or 'brolls'
        const filePath = pathParts.slice(1).join('/');

        // Generate signed URL (valid for 1 hour)
        const { data: signedUrl, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600);

        if (urlError) {
          console.error(`Failed to generate signed URL for ${asset.storage_path}:`, urlError);
          continue;
        }

        assetsWithSignedUrls.push({
          id: asset.id,
          type: asset.type,
          storage_path: asset.storage_path,
          signed_url: signedUrl.signedUrl,
          metadata: asset.metadata
        });
      } catch (urlError) {
        console.error(`Error processing asset ${asset.id}:`, urlError);
      }
    }

    return assetsWithSignedUrls;
  } catch (error) {
    console.error('Error fetching branding assets:', error);
    throw new Error('Failed to fetch branding assets');
  }
}

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

/**
 * Validate that all required data exists for video generation
 */
export function validateVideoGenerationData(
  ugcData: UGCFormData | null,
  brandingAssets: BrandingAsset[]
): void {
  const errors: string[] = [];

  // Check UGC form data
  if (!ugcData) {
    errors.push('No se encontraron datos del formulario UGC. Completa el formulario primero.');
  } else {
    // Validate required UGC fields
    if (!ugcData.client_name?.trim()) {
      errors.push('Nombre del cliente es requerido en el formulario UGC.');
    }
    if (!ugcData.video_duration) {
      errors.push('Duración del video es requerida en el formulario UGC.');
    }
    if (!ugcData.target_audience?.trim()) {
      errors.push('Audiencia objetivo es requerida en el formulario UGC.');
    }
    if (!ugcData.main_objective?.trim()) {
      errors.push('Objetivo principal es requerido en el formulario UGC.');
    }
  }

  // Check branding assets (at least one should exist)
  if (brandingAssets.length === 0) {
    errors.push('No se encontraron assets de marca. Sube al menos un logo o imagen de marca.');
  }

  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}

/**
 * Transform collected data into n8n webhook payload format
 */
export function buildN8NPayload(
  requestId: string,
  userId: string,
  ugcData: UGCFormData,
  brandingAssets: BrandingAsset[],
  modalData: VideoGenerationModalData
): N8NPayload {
  // Separate logo and b-rolls from branding assets
  const logoAsset = brandingAssets.find(asset => asset.type === 'logo');
  const brollAssets = brandingAssets.filter(asset => asset.type === 'broll' || asset.type === 'b-roll');
  
  return {
    idempotency_key: crypto.randomUUID(),
    request_id: requestId,
    user_id: userId,
    branding: {
      logo_url: logoAsset?.signed_url,
      palette: logoAsset?.metadata?.palette
    },
    brolls: brollAssets.map(asset => asset.signed_url),
    ugc_brief: {
      client_name: ugcData.client_name,
      cantidad_creadores: ugcData.cantidad_creadores,
      especificaciones_creadores: ugcData.especificaciones_creadores,
      video_duration: ugcData.video_duration,
      video_duration_other: ugcData.video_duration_other,
      product_display_timing: ugcData.product_display_timing,
      recording_formats: ugcData.recording_formats,
      recording_formats_other: ugcData.recording_formats_other,
      existing_script_links: ugcData.existing_script_links,
      delivery_deadline: ugcData.delivery_deadline,
      app_parts_to_show: ugcData.app_parts_to_show,
      recording_locations: ugcData.recording_locations,
      creator_clothing: ugcData.creator_clothing,
      creator_clothing_other: ugcData.creator_clothing_other,
      creator_appearance_style: ugcData.creator_appearance_style,
      creator_appearance_style_other: ugcData.creator_appearance_style_other,
      creator_activity_while_talking: ugcData.creator_activity_while_talking,
      app_display_method: ugcData.app_display_method,
      script_adherence: ugcData.script_adherence,
      creator_speech_style: ugcData.creator_speech_style,
      brand_pronunciation_guide: ugcData.brand_pronunciation_guide,
      main_objective: ugcData.main_objective,
      key_message: ugcData.key_message,
      brand_values: ugcData.brand_values,
      target_audience: ugcData.target_audience,
      product_or_service: ugcData.product_or_service,
      key_features_benefits: ugcData.key_features_benefits,
      technical_details: ugcData.technical_details,
      video_tone: ugcData.video_tone,
      reference_ugc_videos: ugcData.reference_ugc_videos,
      call_to_action: ugcData.call_to_action,
      competitive_differentiators: ugcData.competitive_differentiators,
      additional_details: ugcData.additional_details
    },
    video_generation: {
      video_count: modalData.videoCount,
      custom_instructions: modalData.customInstructions,
      batch_id: crypto.randomUUID()
    },
    constraints: {
      duration_sec: parseDuration(ugcData.video_duration),
      ratio: parseRatio(ugcData.recording_formats)
    },
    webhook_url: '', // This will be set by the edge function
    created_at: new Date().toISOString()
  };
}

/**
 * Main function to collect all data needed for video generation
 * This is called from the VideoGenerationModal when user clicks "Enviar videos"
 */
export async function collectVideoGenerationData(
  userId: string,
  modalData: VideoGenerationModalData
): Promise<N8NPayload> {
  try {
    // 1. Fetch UGC form data from database
    const { data: ugcData, error: ugcError } = await supabase
      .from('ugc_script_forms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ugcError) {
      console.error('Error fetching UGC form data:', ugcError);
      throw new Error('Error al obtener datos del formulario UGC');
    }

    // 2. Get branding assets with signed URLs
    const brandingAssets = await getBrandingAssetsWithSignedUrls(userId);

    // 3. Validate all required data exists
    validateVideoGenerationData(ugcData, brandingAssets);

    // 4. Generate request ID for this video generation request
    const requestId = crypto.randomUUID();

    // 5. Transform data to n8n contract format
    const payload = buildN8NPayload(requestId, userId, ugcData!, brandingAssets, modalData);

    return payload;

  } catch (error) {
    console.error('Error collecting video generation data:', error);
    
    if (error instanceof Error) {
      toast({
        title: 'Error en la generación de videos',
        description: error.message,
        variant: 'destructive',
      });
    }
    
    throw error;
  }
}

/**
 * Send the collected data to n8n webhook
 * This will be called after data collection is successful
 */
export async function sendToN8NWebhook(payload: N8NPayload): Promise<void> {
  try {
    const response = await fetch(payload.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Contract-Version': '1',
        'Idempotency-Key': payload.request_id,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log('Successfully sent data to n8n webhook');
    
    toast({
      title: 'Videos enviados correctamente',
      description: `Se están procesando ${payload.video_generation.video_count} video(s). Te notificaremos cuando estén listos.`,
    });

  } catch (error) {
    console.error('Error sending to n8n webhook:', error);
    
    toast({
      title: 'Error al enviar videos',
      description: 'No se pudo procesar la solicitud. Intenta nuevamente.',
      variant: 'destructive',
    });
    
    throw error;
  }
}