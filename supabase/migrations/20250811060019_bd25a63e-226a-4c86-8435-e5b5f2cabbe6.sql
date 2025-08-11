-- Video Requests + Assets + Storage buckets + RLS + RPCs
BEGIN;

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_request_status') THEN
    CREATE TYPE public.video_request_status AS ENUM (
      'QUEUED',
      'IDEATION',
      'PRE_REVIEW_PENDING',
      'PRE_APPROVED',
      'GENERATING',
      'EDITING',
      'POST_REVIEW_PENDING',
      'POST_APPROVED',
      'READY',
      'EXPORTED',
      'FAILED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_kind_enum') THEN
    CREATE TYPE public.asset_kind_enum AS ENUM (
      'branding_logo',
      'branding_palette',
      'broll',
      'script',
      'edited_video',
      'thumbnail',
      'other'
    );
  END IF;
END$$;

-- 2) Tables
-- 2.1 video_requests
CREATE TABLE IF NOT EXISTS public.video_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.video_request_status NOT NULL DEFAULT 'QUEUED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_video_requests_updated_at'
  ) THEN
    CREATE TRIGGER trg_video_requests_updated_at
    BEFORE UPDATE ON public.video_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- 2.2 video_request_assets
CREATE TABLE IF NOT EXISTS public.video_request_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.video_requests(id) ON DELETE CASCADE,
  kind public.asset_kind_enum NOT NULL,
  path text NOT NULL,
  metadata jsonb,
  is_private boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3) RLS enable
ALTER TABLE public.video_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_request_assets ENABLE ROW LEVEL SECURITY;

-- 3.1 video_requests policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_requests' AND policyname='video_requests_select_self_or_admin'
  ) THEN
    CREATE POLICY video_requests_select_self_or_admin
    ON public.video_requests
    FOR SELECT
    USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_requests' AND policyname='video_requests_update_admin_only'
  ) THEN
    CREATE POLICY video_requests_update_admin_only
    ON public.video_requests
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_requests' AND policyname='video_requests_delete_admin_only'
  ) THEN
    CREATE POLICY video_requests_delete_admin_only
    ON public.video_requests
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
  END IF;

  -- No INSERT para usuarios; se hará vía RPC SECURITY DEFINER o service role
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_requests' AND policyname='video_requests_insert_admin_only'
  ) THEN
    CREATE POLICY video_requests_insert_admin_only
    ON public.video_requests
    FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- 3.2 video_request_assets policies (dueño del request o admin puede gestionar)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_request_assets' AND policyname='video_request_assets_select_self_or_admin'
  ) THEN
    CREATE POLICY video_request_assets_select_self_or_admin
    ON public.video_request_assets
    FOR SELECT
    USING (
      EXISTS(
        SELECT 1 FROM public.video_requests r
        WHERE r.id = request_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='video_request_assets' AND policyname='video_request_assets_modify_self_or_admin'
  ) THEN
    CREATE POLICY video_request_assets_modify_self_or_admin
    ON public.video_request_assets
    FOR ALL
    USING (
      EXISTS(
        SELECT 1 FROM public.video_requests r
        WHERE r.id = request_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    )
    WITH CHECK (
      EXISTS(
        SELECT 1 FROM public.video_requests r
        WHERE r.id = request_id AND (r.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
      )
    );
  END IF;
END$$;

-- 4) Storage buckets (privados)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('brolls', 'brolls', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('artifacts', 'artifacts', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for storage.objects
-- Admin can do everything on these buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='storage_admin_all_branding'
  ) THEN
    CREATE POLICY storage_admin_all_branding ON storage.objects
      FOR ALL
      USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'))
      WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='storage_admin_all_brolls'
  ) THEN
    CREATE POLICY storage_admin_all_brolls ON storage.objects
      FOR ALL
      USING (bucket_id = 'brolls' AND public.has_role(auth.uid(), 'admin'))
      WITH CHECK (bucket_id = 'brolls' AND public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='storage_admin_all_artifacts'
  ) THEN
    CREATE POLICY storage_admin_all_artifacts ON storage.objects
      FOR ALL
      USING (bucket_id = 'artifacts' AND public.has_role(auth.uid(), 'admin'))
      WITH CHECK (bucket_id = 'artifacts' AND public.has_role(auth.uid(), 'admin'));
  END IF;
END$$;

-- Users can manage their own folder: <user_id>/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='storage_user_manage_branding'
  ) THEN
    CREATE POLICY storage_user_manage_branding ON storage.objects
      FOR ALL TO authenticated
      USING (
        bucket_id = 'branding'
        AND (auth.uid())::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'branding'
        AND (auth.uid())::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='storage_user_manage_brolls'
  ) THEN
    CREATE POLICY storage_user_manage_brolls ON storage.objects
      FOR ALL TO authenticated
      USING (
        bucket_id = 'brolls'
        AND (auth.uid())::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'brolls'
        AND (auth.uid())::text = (storage.foldername(name))[1]
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='objects' AND policyname='storage_user_manage_artifacts'
  ) THEN
    CREATE POLICY storage_user_manage_artifacts ON storage.objects
      FOR ALL TO authenticated
      USING (
        bucket_id = 'artifacts'
        AND (auth.uid())::text = (storage.foldername(name))[1]
      )
      WITH CHECK (
        bucket_id = 'artifacts'
        AND (auth.uid())::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;

-- 5) RPCs
-- 5.1 Crear solicitud (consume 1 crédito, inserta request)
CREATE OR REPLACE FUNCTION public.rpc_create_video_request(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req_id uuid := gen_random_uuid();
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id es requerido';
  END IF;

  -- Permisos: service_role, admin o el propio usuario
  IF current_user <> 'service_role' AND NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = p_user_id) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  -- Consumir crédito idempotente para esta solicitud
  PERFORM public.rpc_consume_credit_for_request(p_user_id, v_req_id, 'Consumo por creación de solicitud');

  -- Insertar solicitud
  INSERT INTO public.video_requests (id, user_id, status)
  VALUES (v_req_id, p_user_id, 'QUEUED');

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_create_video_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_create_video_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_create_video_request(uuid) TO service_role;

-- 5.2 Adjuntar asset a una solicitud
CREATE OR REPLACE FUNCTION public.rpc_add_video_asset(
  p_request_id uuid,
  p_kind public.asset_kind_enum,
  p_path text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_id uuid;
BEGIN
  IF p_request_id IS NULL OR p_kind IS NULL OR p_path IS NULL OR length(p_path) = 0 THEN
    RAISE EXCEPTION 'Parámetros inválidos';
  END IF;

  SELECT user_id INTO v_owner FROM public.video_requests WHERE id = p_request_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;

  -- Permisos: service_role, admin o dueño de la solicitud
  IF current_user <> 'service_role' AND NOT (public.has_role(auth.uid(), 'admin') OR auth.uid() = v_owner) THEN
    RAISE EXCEPTION 'Acceso denegado';
  END IF;

  INSERT INTO public.video_request_assets (request_id, kind, path, metadata)
  VALUES (p_request_id, p_kind, p_path, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_add_video_asset(uuid, public.asset_kind_enum, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_add_video_asset(uuid, public.asset_kind_enum, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_add_video_asset(uuid, public.asset_kind_enum, text, jsonb) TO service_role;

COMMIT;