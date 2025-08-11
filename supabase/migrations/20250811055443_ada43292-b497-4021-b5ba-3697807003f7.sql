-- 1) ENUMs y migración de columnas existentes
BEGIN;

-- Crear ENUMs si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_kind_enum') THEN
    CREATE TYPE public.payment_kind_enum AS ENUM ('subscription', 'one_off');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_source_enum') THEN
    CREATE TYPE public.credit_source_enum AS ENUM (
      'stripe_subscription',
      'stripe_topup',
      'refund',
      'manual_adjustment',
      'admin_grant'
    );
  END IF;
END$$;

-- Migrar payments.payment_kind a payment_kind_enum
ALTER TABLE public.payments
  ALTER COLUMN payment_kind TYPE public.payment_kind_enum
  USING (
    CASE (payment_kind::text)
      WHEN 'purchase' THEN 'one_off'
      ELSE payment_kind::text
    END
  )::public.payment_kind_enum;

-- Migrar credits_ledger.source a credit_source_enum
ALTER TABLE public.credits_ledger
  ALTER COLUMN source TYPE public.credit_source_enum
  USING (
    CASE (source::text)
      WHEN 'subscription' THEN 'stripe_subscription'
      WHEN 'purchase' THEN 'stripe_topup'
      ELSE source::text
    END
  )::public.credit_source_enum;

COMMIT;

-- 2) RLS: mantener políticas existentes (no se alteran aquí)
-- Nota: Las políticas actuales ya cumplen: SELECT propio o admin; writes solo admin.

-- 3) Vista de saldo (recreada para asegurar definición)
CREATE OR REPLACE VIEW public.v_credit_balances AS
SELECT
  cl.user_id,
  COALESCE(SUM(cl.amount), 0)::integer AS balance
FROM public.credits_ledger cl
GROUP BY cl.user_id;

COMMENT ON VIEW public.v_credit_balances IS 'Saldo actual de créditos por usuario (suma de credits_ledger.amount).';

-- 4) RPC transaccionales

-- 4.1 rpc_get_credit_balance: retorna balance del usuario autenticado
CREATE OR REPLACE FUNCTION public.rpc_get_credit_balance()
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(v.balance, 0)
  FROM public.v_credit_balances v
  WHERE v.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.rpc_get_credit_balance() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_get_credit_balance() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_credit_balance() TO service_role;

-- 4.2 rpc_grant_credits: concede créditos positivos con idempotencia por event_id
CREATE OR REPLACE FUNCTION public.rpc_grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_source public.credit_source_enum,
  p_event_id text,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_jwt jsonb;
  v_is_service boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id es requerido';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount debe ser > 0 para concesiones';
  END IF;
  IF p_event_id IS NULL OR length(p_event_id) = 0 THEN
    RAISE EXCEPTION 'p_event_id es requerido para idempotencia';
  END IF;

  -- Permitir solo a admin o service_role
  BEGIN
    v_jwt := auth.jwt();
  EXCEPTION WHEN others THEN
    v_jwt := NULL;
  END;
  IF current_user = 'service_role' THEN
    v_is_service := true;
  END IF;

  IF NOT v_is_service AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acceso denegado: requiere admin o service role';
  END IF;

  -- Serializar por usuario para evitar carreras
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Intento de inserción idempotente
  INSERT INTO public.credits_ledger (user_id, amount, source, payment_id, event_id, note)
  VALUES (p_user_id, p_amount, p_source, NULL, p_event_id, p_note)
  ON CONFLICT (event_id) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.credits_ledger WHERE event_id = p_event_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_grant_credits(uuid, integer, public.credit_source_enum, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_grant_credits(uuid, integer, public.credit_source_enum, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_grant_credits(uuid, integer, public.credit_source_enum, text, text) TO service_role;

COMMENT ON FUNCTION public.rpc_grant_credits(uuid, integer, public.credit_source_enum, text, text) IS 'Concede créditos positivos; idempotente por event_id. Solo admin o service_role.';

-- 4.3 rpc_consume_credit_for_request: consume 1 crédito con idempotencia por request_id
CREATE OR REPLACE FUNCTION public.rpc_consume_credit_for_request(
  p_user_id uuid,
  p_request_id uuid,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id text;
  v_balance integer;
  v_id uuid;
  v_jwt jsonb;
  v_is_service boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id es requerido';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'p_request_id es requerido';
  END IF;

  v_event_id := 'consume:' || p_request_id::text;

  -- Permitir si service_role, admin o el propio usuario
  BEGIN
    v_jwt := auth.jwt();
  EXCEPTION WHEN others THEN
    v_jwt := NULL;
  END;
  IF current_user = 'service_role' THEN
    v_is_service := true;
  END IF;

  IF NOT v_is_service AND NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = p_user_id) THEN
    RAISE EXCEPTION 'Acceso denegado: requiere ser propietario, admin o service role';
  END IF;

  -- Idempotencia: si ya existe, retornar el mismo id
  SELECT id INTO v_id FROM public.credits_ledger WHERE event_id = v_event_id;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Serializar por usuario para evitar condiciones de carrera
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COALESCE(SUM(amount), 0) INTO v_balance FROM public.credits_ledger WHERE user_id = p_user_id;
  IF v_balance < 1 THEN
    RAISE EXCEPTION 'Saldo insuficiente: se requiere >= 1 crédito';
  END IF;

  INSERT INTO public.credits_ledger (user_id, amount, source, payment_id, event_id, note)
  VALUES (p_user_id, -1, 'manual_adjustment', NULL, v_event_id, COALESCE(p_note, 'Consumo de crédito para request ' || p_request_id::text))
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_consume_credit_for_request(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_consume_credit_for_request(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_consume_credit_for_request(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.rpc_consume_credit_for_request(uuid, uuid, text) IS 'Consume 1 crédito (idempotente por request_id). Permite propietario, admin o service_role.';

-- 5) (Opcional documentado) Política de lectura segura en payments
-- Nota: manteniendo RLS de filas, para limitar columnas se recomienda consumir una vista o aplicar grants a columnas en una iteración posterior.

