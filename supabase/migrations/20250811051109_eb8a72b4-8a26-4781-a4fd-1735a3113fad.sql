-- Stripe + Créditos: esquema mínimo

-- 1) Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credit_source') THEN
    CREATE TYPE public.credit_source AS ENUM ('subscription', 'purchase');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_kind') THEN
    CREATE TYPE public.payment_kind AS ENUM ('subscription', 'purchase');
  END IF;
END $$;

-- 2) Tabla stripe_customers
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- RLS: usuarios ven su propio registro, admin ve todo; solo admin puede escribir (edge functions usarán service role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_select_self_or_admin'
  ) THEN
    CREATE POLICY "stripe_customers_select_self_or_admin" ON public.stripe_customers
    FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_insert_admin_only'
  ) THEN
    CREATE POLICY "stripe_customers_insert_admin_only" ON public.stripe_customers
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_update_admin_only'
  ) THEN
    CREATE POLICY "stripe_customers_update_admin_only" ON public.stripe_customers
    FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stripe_customers' AND policyname = 'stripe_customers_delete_admin_only'
  ) THEN
    CREATE POLICY "stripe_customers_delete_admin_only" ON public.stripe_customers
    FOR DELETE USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Trigger updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_stripe_customers_updated_at'
  ) THEN
    CREATE TRIGGER trg_stripe_customers_updated_at
    BEFORE UPDATE ON public.stripe_customers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) Tabla payments (registro de pagos confirmados)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id text,
  stripe_event_id text UNIQUE NOT NULL, -- idempotencia por evento de Stripe
  stripe_object text NOT NULL,          -- tipo de objeto del evento (invoice, checkout.session, etc.)
  payment_kind public.payment_kind NOT NULL, -- subscription | purchase
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,                 -- e.g. 'paid', 'succeeded'
  metadata jsonb,                       -- copia mínima útil del evento
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_user_id_idx ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON public.payments(stripe_customer_id);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_select_self_or_admin'
  ) THEN
    CREATE POLICY "payments_select_self_or_admin" ON public.payments
    FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_insert_admin_only'
  ) THEN
    CREATE POLICY "payments_insert_admin_only" ON public.payments
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_update_admin_only'
  ) THEN
    CREATE POLICY "payments_update_admin_only" ON public.payments
    FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payments' AND policyname = 'payments_delete_admin_only'
  ) THEN
    CREATE POLICY "payments_delete_admin_only" ON public.payments
    FOR DELETE USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_updated_at'
  ) THEN
    CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 4) Tabla credits_ledger (historial de acreditaciones)
CREATE TABLE IF NOT EXISTS public.credits_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source public.credit_source NOT NULL, -- subscription | purchase
  amount integer NOT NULL CHECK (amount <> 0), -- positivo para acreditaciones; (en futuro, negativos para consumo)
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  event_id text, -- opcional, para idempotencia por evento cuando no usemos payment_id
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id),
  UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS credits_ledger_user_id_idx ON public.credits_ledger(user_id);

ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'credits_ledger' AND policyname = 'credits_ledger_select_self_or_admin'
  ) THEN
    CREATE POLICY "credits_ledger_select_self_or_admin" ON public.credits_ledger
    FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'credits_ledger' AND policyname = 'credits_ledger_insert_admin_only'
  ) THEN
    CREATE POLICY "credits_ledger_insert_admin_only" ON public.credits_ledger
    FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'credits_ledger' AND policyname = 'credits_ledger_update_admin_only'
  ) THEN
    CREATE POLICY "credits_ledger_update_admin_only" ON public.credits_ledger
    FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'credits_ledger' AND policyname = 'credits_ledger_delete_admin_only'
  ) THEN
    CREATE POLICY "credits_ledger_delete_admin_only" ON public.credits_ledger
    FOR DELETE USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_credits_ledger_updated_at'
  ) THEN
    CREATE TRIGGER trg_credits_ledger_updated_at
    BEFORE UPDATE ON public.credits_ledger
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 5) Vista de saldo por usuario
CREATE OR REPLACE VIEW public.v_credit_balances AS
SELECT user_id, COALESCE(SUM(amount), 0)::int AS balance
FROM public.credits_ledger
GROUP BY user_id;
