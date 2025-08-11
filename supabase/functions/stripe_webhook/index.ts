import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Optional Stripe signature verification (only when STRIPE_WEBHOOK_SECRET is set)
// We avoid importing Stripe lib to keep this function lightweight; in MOCK we bypass signature.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Helpers
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getEnv = (key: string) => Deno.env.get(key) ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();
  const supabaseUrl = getEnv("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const billingProvider = (Deno.env.get("BILLING_PROVIDER") ?? "mock").toLowerCase();

  const supabase = createClient(supabaseUrl, (serviceKey || getEnv("SUPABASE_ANON_KEY")), {
    auth: { persistSession: false },
  });

  let event: any = null;
  let status = 200;
  let error: string | null = null;
  let idempotencyKey: string | undefined;

  try {
    // In real Stripe mode you would verify signature here.
    // For MOCK or if no secret present, just parse JSON.
    const payload = await req.text();
    try {
      event = JSON.parse(payload);
    } catch (e) {
      throw new Error("Invalid JSON payload");
    }

    idempotencyKey = event?.id;

    // Basic validation
    if (!event?.id || !event?.type) throw new Error("Missing event.id or type");

    // Idempotency: if payment already stored for this event, short-circuit
    const { data: existingPayments, error: existingErr } = await supabase
      .from("payments")
      .select("id")
      .eq("stripe_event_id", event.id)
      .limit(1);
    if (existingErr) throw new Error(`DB check error: ${existingErr.message}`);

    if (existingPayments && existingPayments.length > 0) {
      await supabase.from("webhook_logs").insert({
        direction: "inbound",
        provider: billingProvider === "stripe" ? "stripe" : "mock",
        event_type: event.type,
        idempotency_key: event.id,
        status: 200,
        payload: event,
      });
      return json({ ok: true, idempotent: true });
    }

    // Resolve user by customer/email if provided
    let userId: string | null = null;
    let stripeCustomerId: string | null = null;
    const customer = event?.data?.object?.customer || event?.data?.object?.customer_id;
    const customerEmail = event?.data?.object?.customer_email || event?.data?.object?.email;

    if (customer) {
      stripeCustomerId = String(customer);
      // Try map via stripe_customers
      const { data: sc } = await supabase
        .from("stripe_customers")
        .select("user_id")
        .eq("stripe_customer_id", stripeCustomerId)
        .limit(1);
      if (sc && sc.length > 0) userId = sc[0].user_id;
    }

    if (!userId && customerEmail) {
      // map by email to profiles
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", customerEmail)
        .limit(1);
      if (prof && prof.length > 0) userId = prof[0].id;
    }

    // Prepare payment row
    let paymentKind: "subscription" | "purchase" = "purchase";
    let statusText = "paid";
    let amountCents = 0;
    let currency = (event?.data?.object?.currency || "usd").toLowerCase();
    let creditsGranted = 0;

    const obj = event?.data?.object || {};

    if (event.type === "checkout.session.completed") {
      paymentKind = "purchase";
      amountCents = obj.amount_total ?? obj.amount_paid ?? 0;
      // Expected mock shape: line_items: [{price:{metadata:{credits}}, quantity}]
      const items = obj.line_items || [];
      creditsGranted = items.reduce((sum: number, li: any) => {
        const per = Number(li?.price?.metadata?.credits ?? 0);
        const qty = Number(li?.quantity ?? 1);
        return sum + per * qty;
      }, 0);
    } else if (event.type === "invoice.paid") {
      paymentKind = "subscription";
      amountCents = obj.amount_paid ?? obj.amount_due ?? 0;
      // Base plan credits = sum lines metadata.credits_included (often 0)
      const lines = obj?.lines?.data || [];
      creditsGranted = lines.reduce((sum: number, l: any) => {
        const inc = Number(l?.metadata?.credits_included ?? 0);
        return sum + inc;
      }, 0);
    } else if (event.type === "charge.refunded" || event.type === "invoice.payment_refunded") {
      // Find the most recent PURCHASE payment for this customer and compute reversal
      const { data: lastPayments } = await supabase
        .from("payments")
        .select("id, amount_cents, credits_granted")
        .eq("payment_kind", "purchase")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!lastPayments || lastPayments.length === 0) {
        throw new Error("No purchase payment found to refund");
      }
      const last = lastPayments[0];

      const amountRefunded = obj.amount_refunded ?? obj.amount ?? last.amount_cents;
      const ratio = Math.min(1, Math.max(0, Number(amountRefunded) / Number(last.amount_cents || 1)));
      const creditsToRevert = Math.floor((last.credits_granted || 0) * ratio);

      // Insert a zero-amount payment record for the refund event (for traceability)
      const { data: refundPayment, error: insPayErr } = await supabase
        .from("payments")
        .insert({
          user_id: userId,
          stripe_customer_id: stripeCustomerId,
          stripe_event_id: event.id,
          stripe_object: event.type,
          payment_kind: "purchase",
          amount_cents: 0,
          currency,
          status: "refunded",
          credits_granted: -creditsToRevert,
          metadata: obj,
        })
        .select("id")
        .single();
      if (insPayErr) throw new Error(`Insert refund payment failed: ${insPayErr.message}`);

      if (creditsToRevert > 0 && userId) {
        const { error: ledgerErr } = await supabase.from("credits_ledger").insert({
          user_id: userId,
          amount: -creditsToRevert,
          source: "purchase",
          payment_id: refundPayment.id,
          event_id: event.id,
          note: "Refund compensation",
        });
        if (ledgerErr) throw new Error(`Insert ledger refund failed: ${ledgerErr.message}`);
      }

      await supabase.from("webhook_logs").insert({
        direction: "inbound",
        provider: billingProvider === "stripe" ? "stripe" : "mock",
        event_type: event.type,
        idempotency_key: event.id,
        status: 200,
        payload: event,
      });

      return json({ ok: true, refunded: true });
    } else {
      // Unknown type, just log and exit
      await supabase.from("webhook_logs").insert({
        direction: "inbound",
        provider: billingProvider === "stripe" ? "stripe" : "mock",
        event_type: event.type,
        idempotency_key: event.id,
        status: 200,
        payload: event,
      });
      return json({ ok: true, ignored: true, type: event.type });
    }

    // Insert payment for paid events
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_event_id: event.id,
        stripe_object: event.type,
        payment_kind: paymentKind,
        amount_cents: Math.round(Number(amountCents || 0)),
        currency,
        status: statusText,
        credits_granted: Math.round(Number(creditsGranted || 0)),
        metadata: obj,
      })
      .select("id, credits_granted")
      .single();
    if (payErr) throw new Error(`Insert payment failed: ${payErr.message}`);

    if (payment.credits_granted && payment.credits_granted > 0 && userId) {
      // Add ledger credit with idempotency based on event.id
      // Check if ledger already exists for this event
      const { data: existingLedger } = await supabase
        .from("credits_ledger")
        .select("id")
        .eq("event_id", event.id)
        .limit(1);

      if (!existingLedger || existingLedger.length === 0) {
        const { error: ledgerErr } = await supabase.from("credits_ledger").insert({
          user_id: userId,
          amount: payment.credits_granted,
          source: paymentKind === "subscription" ? "subscription" : "purchase",
          payment_id: payment.id,
          event_id: event.id,
          note: "Credit granted via webhook",
        });
        if (ledgerErr) throw new Error(`Insert ledger failed: ${ledgerErr.message}`);
      }
    }

    await supabase.from("webhook_logs").insert({
      direction: "inbound",
      provider: billingProvider === "stripe" ? "stripe" : "mock",
      event_type: event.type,
      idempotency_key: event.id,
      status: 200,
      payload: event,
    });

    return json({ ok: true, processed: true, elapsed_ms: Date.now() - start });
  } catch (e: any) {
    status = 500;
    error = e?.message || String(e);
    try {
      await (createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_ANON_KEY"), { auth: { persistSession: false } }))
        .from("webhook_logs").insert({
          direction: "inbound",
          provider: (Deno.env.get("BILLING_PROVIDER") ?? "mock").toLowerCase(),
          event_type: event?.type || "unknown",
          idempotency_key: idempotencyKey,
          status,
          error,
          payload: event ?? null,
        });
    } catch (_) {}
    return json({ ok: false, error }, status);
  }
});
