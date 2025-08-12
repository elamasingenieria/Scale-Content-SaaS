import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

const Billing = () => {
  useEffect(() => {
    const id = 'stripe-buy-button-js';
    if (!document.getElementById(id)) {
      const script = document.createElement('script');
      script.id = id;
      script.async = true;
      script.src = 'https://js.stripe.com/v3/buy-button.js';
      document.body.appendChild(script);
    }
  }, []);

  return (
    <>
      <SEO
        title="Billing | UGC Flow"
        description="Suscripción, top‑up y portal de cliente (Stripe Buy Button)."
        canonical="/billing"
      />
      <h1 className="text-xl font-semibold mb-4">Billing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-medium">Suscripción mensual</h2>
          <p className="text-sm text-muted-foreground mb-2">Plan Premium</p>
          <ul className="text-sm text-muted-foreground mb-3 list-disc pl-5">
            <li>Almacenamiento privado</li>
            <li>Créditos mensuales automáticos</li>
            <li>Features exclusivas</li>
          </ul>
          <div className="mt-2">
            <stripe-buy-button
              buy-button-id="buy_btn_1RvNvYGW1LNDxvNyGrhXnkxR"
              publishable-key="pk_test_51RuwgfGW1LNDxvNy44eI4OVLRAwpZT6NXtAx5ba0yXPzbGRSlL7dDGQJLjNqt2FzO38qbLYQlswiN69LTSrjh9xP00sxy2lLiu"
            ></stripe-buy-button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Pagos en modo test de Stripe.</p>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-medium">Créditos extra</h2>
          <p className="text-sm text-muted-foreground mb-3">Packs: 10, 15, 30, 50</p>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Pack 10 créditos</p>
              <stripe-buy-button
                buy-button-id="buy_btn_1RvOPaGW1LNDxvNyGD18efTA"
                publishable-key="pk_test_51RuwgfGW1LNDxvNy44eI4OVLRAwpZT6NXtAx5ba0yXPzbGRSlL7dDGQJLjNqt2FzO38qbLYQlswiN69LTSrjh9xP00sxy2lLiu"
              ></stripe-buy-button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled
                onClick={() =>
                  toast({
                    title: "Próximamente",
                    description: "Pack de 15 créditos aún no disponible.",
                  })
                }
              >
                15 créditos
              </Button>
              <Button
                variant="outline"
                disabled
                onClick={() =>
                  toast({
                    title: "Próximamente",
                    description: "Pack de 30 créditos aún no disponible.",
                  })
                }
              >
                30 créditos
              </Button>
              <Button
                variant="outline"
                disabled
                onClick={() =>
                  toast({
                    title: "Próximamente",
                    description: "Pack de 50 créditos aún no disponible.",
                  })
                }
              >
                50 créditos
              </Button>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-medium">Portal</h2>
          <p className="text-sm text-muted-foreground mb-3">Gestiona tu suscripción</p>
          <Button variant="outline">Abrir portal</Button>
        </div>
      </div>
    </>
  );
};

export default Billing;
