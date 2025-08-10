import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Branding = () => {
  return (
    <>
      <SEO
        title="Branding & Assets | UGC Flow"
        description="Sube logos, paletas y b‑rolls (stub)."
        canonical="/branding"
      />
      <h1 className="text-xl font-semibold mb-4">Branding & Assets</h1>
      <div className="rounded-xl border border-border p-6">
        <p className="text-muted-foreground mb-3">
          Stub: aquí conectaremos Supabase Storage con URLs firmadas.
        </p>
        <div className="flex gap-2">
          <Button variant="brand">Subir logo</Button>
          <Button variant="outline">Subir b‑roll</Button>
        </div>
      </div>
    </>
  );
};

export default Branding;
