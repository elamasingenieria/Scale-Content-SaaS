# Autenticación y Roles (MVP)

Este módulo implementa:
- Login y registro con email/contraseña y Google (Supabase Auth)
- Perfiles (`public.profiles`) y roles por usuario (`public.user_roles`) con RLS segura

## Flujo de alta
1. El usuario se registra (email+password o Google).
2. Trigger `on_auth_user_created` inserta automáticamente su `profiles` y asigna rol por defecto `user` en `user_roles`.
3. El usuario accede al dashboard tras confirmar email (si la confirmación está activa).

## Determinación de rol
- Por defecto: `user`.
- Para promover a admin:
```sql
insert into public.user_roles (user_id, role)
values ('<USER_UUID>', 'admin')
on conflict do nothing;
```
- `collab` queda reservado para futuro.

## Visibilidad por rol (RLS)
- Usuario autenticado: solo puede leer/actualizar su propio `profiles` y ver sus propios `user_roles`.
- Admin: puede listar todos los perfiles y todos los roles; puede insertar/actualizar/borrar en `user_roles`.

## Consideraciones
- Google: habilitar el proveedor en Supabase (Auth > Providers) y añadir los Redirect URLs del sitio.
- Email links: `emailRedirectTo` se establece a `window.location.origin/` en el FE.
- Seguridad: RLS activo; función `public.has_role(uid, role)` evita recursión; triggers con `search_path` seguro.
- Recomendación: revisar y ajustar la caducidad de OTP en Auth Settings (ver Supabase docs).
