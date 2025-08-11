# Pagos con Stripe + Acreditación de créditos (MVP)

Este documento describe el esquema mínimo, flujo y contratos para:
- Suscripción mensual y compra de créditos extra (Stripe Checkout/Portal).
- Acreditación de créditos al confirmarse el pago.

Estado actual (DB):
- Enums: credit_source (subscription|purchase), payment_kind (subscription|purchase)
- Tablas:
  - public.stripe_customers(user_id, stripe_customer_id)
  - public.payments(id, user_id, stripe_customer_id, stripe_event_id, stripe_object, payment_kind, amount_cents, currency, status, metadata, created_at, updated_at)
  - public.credits_ledger(id, user_id, source, amount, payment_id, event_id, note, created_at, updated_at)
- Vista: public.v_credit_balances(user_id, balance)
- RLS: los usuarios ven sus propios registros; solo admin puede escribir (las Edge Functions usarán service role y por tanto bypass RLS).

Contratos y orquestación
- La WebApp NO habla con Stripe directamente. Usamos Edge Functions y webhooks (n8n P2).
- Webhook stripe_webhook (público, firmado por Stripe) procesará eventos y acreditará créditos. Idempotencia por `stripe_event_id` (payments) y `event_id`/`payment_id` (credits_ledger).

Asignación de créditos (regla simple y estable)
- Se toma de `price.metadata.credits` (entero) o de `line_item.price.metadata.credits`.
- Suscripción: en `invoice.paid`, sumar el total de créditos de las líneas (una vez por factura). Fuente = `subscription`.
- Compra puntual: en `checkout.session.completed` (para `mode=payment`) o `invoice.paid` si usas Prices con facturación. Fuente = `purchase`.

Mapping usuario ↔️ Stripe customer
- Guardamos `stripe_customer_id` en `public.stripe_customers`.
- En webhook, si llega un evento con `customer` y no existe, se crea el vínculo buscando al usuario por email del `customer`/`charge`/`invoice` (según evento). Si no hay email, se registra el pago sin `user_id` y NO se acreditan créditos hasta enlazar manualmente (admin).

Saldo de créditos
- Historial: `public.credits_ledger` (positivo = acreditación; el consumo será futuro y usará montos negativos).
- Saldo: `SELECT balance FROM public.v_credit_balances WHERE user_id = :uid`.

Eventos Stripe admitidos (MVP)
- `invoice.paid`: suscripciones y compras facturadas → registra `payments` y acredita.
- `checkout.session.completed`: compras puntuales con `mode=payment` → registra y acredita.

Idempotencia
- `payments.stripe_event_id` UNIQUE → no se repite el mismo evento.
- `credits_ledger.payment_id` UNIQUE y/o `event_id` UNIQUE → evita doble acreditación.

Cómo configurar
1) Stripe
- Añade metadato `credits` (entero) en cada Price que acredite créditos.
- Crea el Webhook en Stripe apuntando a: https://isgyytimeqyxyokarrds.functions.supabase.co/stripe_webhook
  - Eventos: `invoice.paid`, `checkout.session.completed`.
2) Secrets en Supabase → Edge Functions
- STRIPE_SECRET_KEY (sk_test_...)
- STRIPE_WEBHOOK_SECRET (whsec_...)
3) Verificación
- Consulta `payments` y `credits_ledger` tras un pago de prueba.
- Ver saldo en `v_credit_balances`.

Notas
- No almacenamos datos de tarjeta (solo IDs de Stripe).
- Auditoría mínima: `payments` + `credits_ledger` con referencias.
- Para admins: se puede insertar una línea manual en `credits_ledger` con `note` (ajustes).
