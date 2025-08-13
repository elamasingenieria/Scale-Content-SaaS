-- Create function to handle batch video request creation with atomic credit deduction
CREATE OR REPLACE FUNCTION public.rpc_create_video_batch(
  p_user_id UUID,
  p_video_count INT,
  p_custom_instructions TEXT DEFAULT '',
  p_ugc_data JSONB DEFAULT NULL,
  p_branding_assets JSONB DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_balance INTEGER;
  v_event_id TEXT;
  v_request_ids UUID[] := ARRAY[]::UUID[];
  v_request_id UUID;
  v_credit_ledger_id UUID;
  v_i INTEGER;
  v_result JSON;
BEGIN
  -- Validate required parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id es requerido';
  END IF;
  
  IF p_video_count IS NULL OR p_video_count <= 0 THEN
    RAISE EXCEPTION 'p_video_count debe ser > 0';
  END IF;
  
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) = 0 THEN
    RAISE EXCEPTION 'p_idempotency_key es requerido para evitar duplicados';
  END IF;

  -- Check permissions: service_role, admin or own user
  IF current_user <> 'service_role' AND NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = p_user_id) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Create event ID for idempotency
  v_event_id := 'batch_consume:' || p_idempotency_key;

  -- Check for existing batch with same idempotency key
  IF EXISTS (SELECT 1 FROM public.credits_ledger WHERE event_id = v_event_id) THEN
    -- Return existing batch info
    SELECT json_build_object(
      'success', true,
      'batch_id', v_batch_id,
      'request_ids', ARRAY(
        SELECT id FROM public.video_requests 
        WHERE user_id = p_user_id 
        AND created_at > now() - INTERVAL '1 hour'
        ORDER BY created_at DESC 
        LIMIT p_video_count
      ),
      'message', 'Batch ya procesado anteriormente'
    ) INTO v_result;
    RETURN v_result;
  END IF;

  -- Lock user to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Check current credit balance
  SELECT COALESCE(SUM(amount), 0) INTO v_balance 
  FROM public.credits_ledger 
  WHERE user_id = p_user_id;

  IF v_balance < p_video_count THEN
    RAISE EXCEPTION 'Saldo insuficiente: tienes %, necesitas %', v_balance, p_video_count;
  END IF;

  -- Deduct credits for the entire batch
  INSERT INTO public.credits_ledger (user_id, amount, source, payment_id, event_id, note)
  VALUES (
    p_user_id, 
    -p_video_count, 
    'manual_adjustment', 
    NULL, 
    v_event_id, 
    'Consumo por lote de ' || p_video_count || ' solicitudes de video'
  )
  RETURNING id INTO v_credit_ledger_id;

  -- Create video requests in batch
  FOR v_i IN 1..p_video_count LOOP
    v_request_id := gen_random_uuid();
    
    INSERT INTO public.video_requests (
      id, 
      user_id, 
      status
    )
    VALUES (
      v_request_id,
      p_user_id,
      'QUEUED'
    );
    
    v_request_ids := array_append(v_request_ids, v_request_id);
  END LOOP;

  -- Return success with batch information
  RETURN json_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'request_ids', v_request_ids,
    'credits_deducted', p_video_count,
    'remaining_balance', v_balance - p_video_count,
    'credit_ledger_id', v_credit_ledger_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Log the error and re-raise
  RAISE;
END;
$$;