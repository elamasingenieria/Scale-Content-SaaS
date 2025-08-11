-- 1) user_intake: payload JSONB por usuario
create table if not exists public.user_intake (
  user_id uuid primary key,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.user_intake enable row level security;

-- Policies
create policy user_intake_select_self_or_admin
on public.user_intake
for select
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy user_intake_insert_self_or_admin
on public.user_intake
for insert
with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy user_intake_update_self_or_admin
on public.user_intake
for update
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
create trigger update_user_intake_updated_at
before update on public.user_intake
for each row execute function public.update_updated_at_column();

-- 2) branding_assets: metadatos de archivos de marca
create table if not exists public.branding_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  storage_path text not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, storage_path)
);

create index if not exists idx_branding_assets_user on public.branding_assets(user_id);

alter table public.branding_assets enable row level security;

create policy branding_assets_select_self_or_admin
on public.branding_assets
for select
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy branding_assets_insert_self_or_admin
on public.branding_assets
for insert
with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy branding_assets_update_self_or_admin
on public.branding_assets
for update
using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy branding_assets_delete_admin_only
on public.branding_assets
for delete
using (public.has_role(auth.uid(), 'admin'));

create trigger update_branding_assets_updated_at
before update on public.branding_assets
for each row execute function public.update_updated_at_column();

-- 3) RPCs
-- Upsert del intake del usuario autenticado
create or replace function public.rpc_upsert_user_intake(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Requiere autenticación';
  end if;
  if p_payload is null then
    raise exception 'payload es requerido';
  end if;

  insert into public.user_intake(user_id, payload)
  values (v_uid, p_payload)
  on conflict (user_id)
  do update set payload = excluded.payload, updated_at = now();

  return v_uid;
end;
$$;

-- Registrar/actualizar un asset de branding del usuario autenticado
create or replace function public.rpc_register_branding_asset(p_type text, p_storage_path text, p_metadata jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_is_valid boolean;
begin
  if v_uid is null then
    raise exception 'Requiere autenticación';
  end if;
  if p_type is null or length(trim(p_type)) = 0 then
    raise exception 'type es requerido';
  end if;
  if p_storage_path is null or length(trim(p_storage_path)) = 0 then
    raise exception 'storage_path es requerido';
  end if;

  -- Validar que el path pertenezca al usuario y a los buckets permitidos
  v_is_valid := (
    p_storage_path like ('branding/' || v_uid::text || '/%') or
    p_storage_path like ('brolls/'   || v_uid::text || '/%')
  );
  if not v_is_valid then
    raise exception 'storage_path inválido: debe comenzar con branding/%% o brolls/%% del usuario';
  end if;

  insert into public.branding_assets(user_id, type, storage_path, metadata)
  values (v_uid, p_type, p_storage_path, p_metadata)
  on conflict (user_id, storage_path)
  do update set type = excluded.type, metadata = excluded.metadata, updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;