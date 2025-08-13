import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// n8n webhook configuration
const N8N_WEBHOOK_URL = 'https://devwebhookn8n.ezequiellamas.com/webhook/f4914fae-9e10-442f-88bc-f80ee2a5f244';
const CONTRACT_VERSION = '1';

export interface WebhookResponse {
  success: boolean;
  message?: string;
  batch_id?: string;
  processing_id?: string;
  error?: string;
}

export interface WebhookError {
  message: string;
  status: number;
  response?: string;
}

/**
 * Send payload to n8n webhook with retry mechanism
 */
export async function sendToN8NWithRetry(
  payload: any,
  idempotencyKey: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<WebhookResponse> {
  let lastError: WebhookError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempting n8n webhook call (${attempt + 1}/${maxRetries})`);
      
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Contract-Version': CONTRACT_VERSION,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw {
          message: `n8n webhook error: ${response.status}`,
          status: response.status,
          response: responseText
        };
      }

      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        // If response is not JSON, treat as success with text response
        result = { success: true, message: responseText };
      }

      console.log('n8n webhook success:', result);
      
      // Log successful webhook call
      await logWebhookCall(idempotencyKey, 'outgoing', 'n8n_video_generation', 200, payload, result);
      
      return {
        success: true,
        ...result
      };

    } catch (error: any) {
      lastError = error;
      console.error(`n8n webhook attempt ${attempt + 1} failed:`, error);

      // Log failed webhook call
      await logWebhookCall(
        idempotencyKey, 
        'outgoing', 
        'n8n_video_generation', 
        error.status || 500, 
        payload, 
        null, 
        error.message
      );

      // If this is the last attempt, don't wait
      if (attempt === maxRetries - 1) {
        break;
      }

      // Exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Log webhook calls to database for audit trail
 */
async function logWebhookCall(
  idempotencyKey: string,
  direction: 'incoming' | 'outgoing',
  eventType: string,
  status: number,
  payload: any,
  responseData: any = null,
  error: string | null = null
): Promise<void> {
  try {
    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        direction,
        event_type: eventType,
        status,
        payload,
        response_data: responseData,
        error,
        idempotency_key: idempotencyKey,
        provider: 'n8n',
      });

    if (logError) {
      console.error('Error logging webhook call:', logError);
    }
  } catch (error) {
    console.error('Failed to log webhook call:', error);
  }
}

/**
 * Update video request statuses after n8n processing begins
 */
export async function updateVideoRequestsWithN8NResponse(
  batchId: string,
  response: WebhookResponse
): Promise<void> {
  if (!response.success) {
    return;
  }

  // This would be used to update video requests status
  // For now, we'll just log the success
  console.log(`Video batch ${batchId} sent to n8n successfully`);
}

/**
 * Validate that all required data exists for n8n webhook
 */
export function validateWebhookPayload(payload: any): void {
  const errors: string[] = [];

  if (!payload.user_id) {
    errors.push('ID de usuario es requerido');
  }

  if (!payload.ugc_brief) {
    errors.push('Datos del formulario UGC son requeridos');
  }

  if (!payload.video_generation?.video_count || payload.video_generation.video_count <= 0) {
    errors.push('Cantidad de videos debe ser mayor a 0');
  }

  if (!payload.branding || (!payload.branding.logo_url && payload.brolls.length === 0)) {
    errors.push('Se requiere al menos un logo o video b-roll para la generación');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('. '));
  }
}

/**
 * Get user-friendly error message from webhook error
 */
export function getWebhookErrorMessage(error: any): string {
  if (error.status === 400) {
    return 'Datos inválidos enviados al procesador. Verifique el formulario UGC.';
  } else if (error.status === 401) {
    return 'Error de autenticación con el servicio de generación.';
  } else if (error.status === 429) {
    return 'Demasiadas solicitudes. Intente nuevamente en unos minutos.';
  } else if (error.status >= 500) {
    return 'Error interno del servicio de generación. Intente nuevamente más tarde.';
  } else if (error.message?.includes('fetch')) {
    return 'Error de conexión con el servicio de generación. Verifique su conexión a internet.';
  } else {
    return 'Error inesperado al enviar videos para procesamiento.';
  }
}