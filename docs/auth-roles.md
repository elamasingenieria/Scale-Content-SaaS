# Autenticación (email + Google) y Roles (admin, user, collab)

Este documento resume las decisiones y el flujo implementado para Auth + Perfiles + Roles.

## Flujo de alta (signup / login)
- Email+contraseña: `signUp` con `emailRedirectTo = <SITE_URL>/` para confirmar correo; `signInWithPassword` para login.
- Google (OAuth): `signInWithOAuth('google')` con `redirectTo = <SITE_URL>/`.
- Al autenticarse, un trigger `public.handle_new_user` crea automáticamente el registro en `public.profiles` y asigna el rol por defecto `user` en `public.user_roles`.

## Perfiles y roles
- `public.profiles (id uuid = auth.users.id, email, display_name, avatar_url, timestamps)`
- `public.app_role` (enum): `admin | user | collab` (collab reservado para futuro)
- `public.user_roles (user_id, role)` con `UNIQUE(user_id, role)`
- Helper `public.has_role(user_id, role)` (SECURITY DEFINER) para usar en RLS sin recursión.

## Reglas de acceso (RLS)
- profiles
  - SELECT: el propio usuario o `admin` → `auth.uid() = id OR has_role(auth.uid(),'admin')`
  - INSERT/UPDATE: propio o `admin`
- user_roles
  - SELECT: propios roles o cualquiera si `admin`
  - INSERT/UPDATE/DELETE: solo `admin`

## ¿Cómo se determina el rol?
- Por defecto todo usuario nuevo recibe `user` (trigger post-signup).
- Para hacer admin a un usuario:
```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>', 'admin')
on conflict do nothing;
```

## Qué puede ver cada rol
- user: solo su propio `profile` y sus propios `user_roles`.
- admin: puede listar/leer todos los `profiles` y todos los `user_roles`; puede gestionar roles.

## Notas
- Ajusta en Supabase Auth la configuración de Site URL/Redirect URL y el proveedor de Google.
- Recomendación: si estás probando, puedes desactivar “Confirm email” temporalmente para acelerar el login.
