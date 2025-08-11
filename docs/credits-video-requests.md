# Créditos y Solicitudes de Video (MVP)

Este documento describe el flujo para solicitar un video consumiendo 1 crédito y cómo referenciar assets y artefactos por rutas en Storage privado.

## Reglas de negocio
- 1 crédito = 1 video.
- Antes de crear una solicitud, se verifica el saldo y se descuenta 1 de forma atómica e idempotente.
- No hay dobles descuentos: la misma solicitud no puede descontar dos veces (idempotencia por `consume:<request_id>` en `credits_ledger.event_id`).
- Acreditaciones y consumos se registran en `credits_ledger`; el saldo se consulta en `v_credit_balances`.

## Esquema (nuevo)
- Enum `video_request_status`: estados del ciclo de vida (QUEUED → ... → READY/EXPORTED | FAILED).
- Tabla `video_requests(id, user_id, status, created_at, updated_at)`.
- Enum `asset_kind_enum`: `branding_logo|branding_palette|broll|script|edited_video|thumbnail|other`.
- Tabla `video_request_assets(id, request_id, kind, path, metadata, is_private, created_at)`.
- Buckets privados: `branding`, `brolls`, `artifacts` (RLS por carpeta `<user_id>/...` + admin).

## RLS
- `video_requests`: SELECT propio o admin. INSERT/UPDATE/DELETE restringido (se usa RPC con SECURITY DEFINER o service role).
- `video_request_assets`: dueño del request o admin puede leer y modificar.

## RPCs
1) Obtener saldo
- `rpc_get_credit_balance() -> integer`

2) Conceder créditos (admin/service)
- `rpc_grant_credits(p_user_id uuid, p_amount int>0, p_source credit_source_enum, p_event_id text, p_note text)`
- Idempotente por `event_id` (UNIQUE en `credits_ledger.event_id`).

3) Consumir 1 crédito para una solicitud (propietario/admin/service)
- `rpc_consume_credit_for_request(p_user_id uuid, p_request_id uuid, p_note text)`
- Idempotente por `consume:<request_id>`.

4) Crear solicitud de video (consume 1 crédito)
- `rpc_create_video_request(p_user_id uuid default auth.uid()) -> uuid`
- Paso atómico: descuenta 1 (via `rpc_consume_credit_for_request`) e inserta en `video_requests` con estado `QUEUED`.

5) Adjuntar asset a una solicitud
- `rpc_add_video_asset(p_request_id uuid, p_kind asset_kind_enum, p_path text, p_metadata jsonb)`

## Flujo “Solicitar video” (cliente)
1. Autenticado, invoca `rpc_create_video_request()`.
2. Si el saldo < 1 → error `Saldo insuficiente` (no se crea la solicitud).
3. Si ok → retorna `request_id` ya con el descuento aplicado.
4. (Opcional) Subir archivos a Storage en la carpeta `<user_id>/...` y registrar referencias con `rpc_add_video_asset`.

## Idempotencia
- `payments.stripe_event_id` permanece UNIQUE para pagos.
- `credits_ledger.event_id` UNIQUE evita duplicar efectos (p.ej., reintentos de webhooks o consumos).

## Consultas de verificación rápidas
- ¿Saldo?: `select balance from v_credit_balances where user_id = :uid;`
- Últimos movimientos: `select * from credits_ledger where user_id = :uid order by created_at desc limit 20;`
- Solicitudes: `select * from video_requests where user_id = :uid order by created_at desc;`
- Assets: `select * from video_request_assets where request_id = :rid;`

## Pasos para pasar a producción
- Revisar políticas de Storage y rutas `<user_id>/...`.
- Conectar webhook real de Stripe (cuando se active billing real) y mantener idempotencia.
- Mantener buckets privados; exponer media por URLs firmadas de vida corta.
