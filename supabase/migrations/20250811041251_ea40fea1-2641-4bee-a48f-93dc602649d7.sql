-- Auth + Profiles + Roles setup
-- 1) Enum de roles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','user','collab');
  END IF;
END $$;

-- 2) Tabla profiles (vinculada a auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3) Tabla user_roles (roles por usuario)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4) Función helper para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Trigger de updated_at en profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 6) Función para verificación de roles (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- 7) Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 8) Políticas RLS para profiles
-- Leer: el propio usuario o admin
CREATE POLICY IF NOT EXISTS "profiles_select_self_or_admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin')
);

-- Insertar: propio registro (o admin)
CREATE POLICY IF NOT EXISTS "profiles_insert_self_or_admin"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin')
);

-- Actualizar: propio o admin
CREATE POLICY IF NOT EXISTS "profiles_update_self_or_admin"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  auth.uid() = id OR public.has_role(auth.uid(), 'admin')
);

-- 9) Políticas RLS para user_roles
-- Selección: ver los propios roles o cualquiera si es admin
CREATE POLICY IF NOT EXISTS "user_roles_select_self_or_admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Insertar/Actualizar/Borrar: solo admin
CREATE POLICY IF NOT EXISTS "user_roles_insert_admin_only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "user_roles_update_admin_only"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY IF NOT EXISTS "user_roles_delete_admin_only"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 10) Trigger para auto-crear profile y rol por defecto en signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Insertar perfil base
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Asignar rol por defecto 'user'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;
