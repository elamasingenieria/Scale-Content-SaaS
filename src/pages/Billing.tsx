import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Billing = () => {
  return (
    <>
      <SEO
        title="Billing | UGC Flow"
        description="Suscripción, top‑up y portal de cliente (stub)."
        canonical="/billing"
      />
      <h1 className="text-xl font-semibold mb-4">Billing</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-medium">Suscripción</h2>
          <p className="text-sm text-muted-foreground mb-3">Plan Premium</p>
          <Button variant="brand">Suscribirme</Button>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-medium">Créditos extra</h2>
          <p className="text-sm text-muted-foreground mb-3">Packs de 10</p>
          <Button variant="brand">Comprar</Button>
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
