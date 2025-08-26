// Tipos de webhook estandarizados para el sistema
export const WEBHOOK_TYPES = {
  VIDEO_GENERATION_REQUEST: 'video_generation_request',
  VIDEO_STATUS_UPDATE: 'video_status_update', 
  STRIPE_PAYMENT: 'stripe_payment',
  ADMIN_TEST: 'admin_test'
} as const;

export type WebhookType = typeof WEBHOOK_TYPES[keyof typeof WEBHOOK_TYPES];

export interface WebhookLogEntry {
  direction: 'incoming' | 'outgoing';
  event_type: WebhookType;
  status: number;
  payload: any;
  response_data?: any;
  error?: string;
  execution_time_ms?: number;
  request_size_bytes?: number;
  idempotency_key?: string;
  request_id?: string;
  provider?: string;
}