import { useState } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import BrandingIntakeWizard from "@/components/branding/BrandingIntakeWizard";

const Branding = () => {
  const [showWizard, setShowWizard] = useState(false);

  return (
    <>
      <SEO
        title="Branding & Personalización | UGC Flow"
        description="Sube assets y completa el formulario para personalización."
        canonical="/branding"
      />

      {!showWizard && (
        <div className="rounded-xl border border-border p-6 animate-fade-in">
          <h1 className="text-xl font-semibold mb-2">Branding & Assets</h1>
          <p className="text-muted-foreground mb-4">
            Carga tus logos y b‑rolls, y luego completa el formulario para personalizar tus videos.
          </p>
          <Button size="lg" className="hover-scale" onClick={() => setShowWizard(true)}>
            Lanzar formulario
          </Button>
        </div>
      )}

      {showWizard && <BrandingIntakeWizard />}
    </>
  );
};

export default Branding;
