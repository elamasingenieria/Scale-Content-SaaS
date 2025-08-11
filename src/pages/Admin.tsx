import { useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const canonical = "/admin";

const Admin = () => {
  const { toast } = useToast();

  // Asignación de créditos
  const [email, setEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState<number>(10);
  const [grantLoading, setGrantLoading] = useState(false);

  const grantCredits = async () => {
    try {
      setGrantLoading(true);
      // Buscar usuario por email
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email")
        .ilike("email", email)
        .limit(1);
      if (pErr) throw pErr;
      if (!profiles || profiles.length === 0) throw new Error("Usuario no encontrado");
      const userId = profiles[0].id as string;

      const eventId = `admin:grant:${userId}:${Date.now()}`;
      const { error: rpcErr } = await supabase.rpc("rpc_grant_credits", {
        p_user_id: userId,
        p_amount: grantAmount,
        p_source: "purchase" as any, // enum credit_source_enum
        p_event_id: eventId,
        p_note: `Grant manual desde Admin a ${email}`,
      });
      if (rpcErr) throw rpcErr;

      toast({ title: "Créditos acreditados", description: `+${grantAmount} a ${email}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || String(e), variant: "destructive" });
    } finally {
      setGrantLoading(false);
    }
  };

  // Emisor de eventos Stripe (MOCK)
  const [eventType, setEventType] = useState<string>("checkout.session.completed");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [creditsPack, setCreditsPack] = useState<number>(10);
  const [amountCents, setAmountCents] = useState<number>(999);
  const [payloadPreview, setPayloadPreview] = useState<string>("");
  const [sendingMock, setSendingMock] = useState(false);

  const buildMockEvent = (): any => {
    const id = `evt_mock_${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    if (eventType === "checkout.session.completed") {
      return {
        id,
        type: eventType,
        created,
        data: {
          object: {
            customer: `cus_mock_${created}`,
            customer_email: customerEmail || email,
            amount_total: amountCents,
            currency: "usd",
            line_items: [
              {
                price: {
                  id: `price_mock_${creditsPack}`,
                  metadata: { credits: creditsPack },
                },
                product: "prod_mock_credits",
                quantity: 1,
              },
            ],
          },
        },
      };
    }

    if (eventType === "invoice.paid") {
      return {
        id,
        type: eventType,
        created,
        data: {
          object: {
            customer: `cus_mock_${created}`,
            customer_email: customerEmail || email,
            amount_paid: amountCents,
            currency: "usd",
            lines: {
              data: [
                {
                  price: { id: "price_base_plan", recurring: { interval: "month" } },
                  product: "prod_base_plan",
                  metadata: { type: "base_plan", credits_included: 0 },
                },
              ],
            },
          },
        },
      };
    }

    // charge.refunded / invoice.payment_refunded
    return {
      id,
      type: eventType,
      created,
      data: {
        object: {
          customer: `cus_mock_${created}`,
          customer_email: customerEmail || email,
          amount_refunded: amountCents, // usar amountCents para simular reembolso total/parcial
          currency: "usd",
        },
      },
    };
  };

  useEffect(() => {
    const evt = buildMockEvent();
    setPayloadPreview(JSON.stringify(evt, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, customerEmail, creditsPack, amountCents, email]);

  const sendMockEvent = async () => {
    try {
      setSendingMock(true);
      const evt = buildMockEvent();
      const { data, error } = await supabase.functions.invoke("stripe_webhook", { body: evt });
      if (error) throw error;
      toast({ title: "Evento enviado", description: `type=${evt.type}` });
    } catch (e: any) {
      toast({ title: "Error al enviar evento", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSendingMock(false);
    }
  };

  // Test webhook de n8n
  const n8nUrl = "https://devwebhookn8n.ezequiellamas.com/webhook/f4914fae-9e10-442f-88bc-f80ee2a5f244";
  const [n8nBody, setN8nBody] = useState<string>(JSON.stringify({ source: "admin-ui", ts: Date.now() }, null, 2));
  const [n8nLoading, setN8nLoading] = useState(false);

  const sendN8n = async () => {
    try {
      setN8nLoading(true);
      const res = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: n8nBody,
      });
      toast({ title: `n8n: ${res.status}`, description: await res.text() });
    } catch (e: any) {
      toast({ title: "Error n8n", description: e.message || String(e), variant: "destructive" });
    } finally {
      setN8nLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Admin Dashboard – UGC Flow"
        description="Panel de administración: créditos, Stripe MOCK y pruebas de webhooks."
        canonical={canonical}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "UGC Flow Admin",
          applicationCategory: "BusinessApplication",
        }}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Gestión de créditos, pruebas de Stripe (MOCK) y webhook n8n.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Asignación de créditos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="grant-email">Email del usuario</Label>
              <Input id="grant-email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="grant-amount">Cantidad</Label>
              <Input
                id="grant-amount"
                type="number"
                min={1}
                value={grantAmount}
                onChange={(e) => setGrantAmount(parseInt(e.target.value || "0", 10))}
              />
            </div>
            <Button onClick={grantCredits} disabled={grantLoading || !email || grantAmount <= 0}>
              {grantLoading ? "Acreditando..." : "Acreditar"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test webhook n8n</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>Endpoint</Label>
              <Input value={n8nUrl} readOnly />
            </div>
            <div className="grid gap-2">
              <Label>Body</Label>
              <Textarea rows={8} value={n8nBody} onChange={(e) => setN8nBody(e.target.value)} />
            </div>
            <Button onClick={sendN8n} disabled={n8nLoading}>
              {n8nLoading ? "Enviando..." : "Enviar a n8n"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Emisor de eventos Stripe (MOCK)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de evento</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkout.session.completed">checkout.session.completed</SelectItem>
                    <SelectItem value="invoice.paid">invoice.paid</SelectItem>
                    <SelectItem value="charge.refunded">charge.refunded</SelectItem>
                    <SelectItem value="invoice.payment_refunded">invoice.payment_refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Email cliente</Label>
                <Input placeholder="user@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Créditos (pack)</Label>
                <Input type="number" min={0} value={creditsPack} onChange={(e) => setCreditsPack(parseInt(e.target.value || "0", 10))} />
              </div>
              <div className="grid gap-2">
                <Label>Monto (cents)</Label>
                <Input type="number" min={0} value={amountCents} onChange={(e) => setAmountCents(parseInt(e.target.value || "0", 10))} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => { setEventType("checkout.session.completed"); setCreditsPack(10); setAmountCents(1000); }}>Pack 10</Button>
              <Button variant="secondary" onClick={() => { setEventType("checkout.session.completed"); setCreditsPack(30); setAmountCents(2800); }}>Pack 30</Button>
              <Button variant="secondary" onClick={() => { setEventType("invoice.paid"); setCreditsPack(0); setAmountCents(1000); }}>Base plan</Button>
              <Button variant="secondary" onClick={() => { setEventType("charge.refunded"); }}>Refund</Button>
            </div>
            <Separator />
            <div className="grid gap-2">
              <Label>Payload</Label>
              <Textarea rows={14} value={payloadPreview} readOnly />
            </div>
            <Button onClick={sendMockEvent} disabled={sendingMock}>
              {sendingMock ? "Enviando..." : "Emitir evento al webhook"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Admin;
