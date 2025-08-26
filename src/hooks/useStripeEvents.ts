import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useStripeEvents = () => {
  const { toast } = useToast();
  const [eventType, setEventType] = useState<string>("checkout.session.completed");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [creditsPack, setCreditsPack] = useState<number>(10);
  const [amountCents, setAmountCents] = useState<number>(999);
  const [payloadPreview, setPayloadPreview] = useState<string>("");
  const [sendingMock, setSendingMock] = useState(false);

  const buildMockEvent = useCallback((email?: string): any => {
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
          amount_refunded: amountCents,
          currency: "usd",
        },
      },
    };
  }, [eventType, customerEmail, creditsPack, amountCents]);

  // Update payload preview whenever inputs change
  useEffect(() => {
    const evt = buildMockEvent();
    setPayloadPreview(JSON.stringify(evt, null, 2));
  }, [buildMockEvent]);

  const sendMockEvent = useCallback(async (email?: string) => {
    try {
      setSendingMock(true);
      const evt = buildMockEvent(email);
      const { data, error } = await supabase.functions.invoke("stripe_webhook", { body: evt });
      if (error) throw error;
      toast({ title: "Evento enviado", description: `type=${evt.type}` });
    } catch (e: any) {
      toast({ title: "Error al enviar evento", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSendingMock(false);
    }
  }, [buildMockEvent, toast]);

  return {
    eventType,
    setEventType,
    customerEmail,
    setCustomerEmail,
    creditsPack,
    setCreditsPack,
    amountCents,
    setAmountCents,
    payloadPreview,
    sendingMock,
    sendMockEvent,
  };
};