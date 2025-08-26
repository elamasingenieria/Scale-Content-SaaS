-- Agregar política para que service_role pueda escribir en artifacts bucket
CREATE POLICY "service_role_artifacts_access" 
ON storage.objects 
FOR ALL 
TO service_role 
USING (bucket_id = 'artifacts') 
WITH CHECK (bucket_id = 'artifacts');

-- Agregar campos de debugging a video_requests
ALTER TABLE video_requests 
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_webhook_received_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Mejorar webhook_logs con más contexto de debugging
ALTER TABLE webhook_logs 
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS request_size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS response_headers JSONB;