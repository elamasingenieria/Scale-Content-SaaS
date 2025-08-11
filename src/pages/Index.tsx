import { useState } from "react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Film, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
const Dashboard = () => {
  const [pointer, setPointer] = useState({ x: "50%", y: "50%" });

  const onMove = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPointer({ x: `${x}%`, y: `${y}%` });
    (e.currentTarget as HTMLDivElement).style.setProperty("--x", pointer.x);
    (e.currentTarget as HTMLDivElement).style.setProperty("--y", pointer.y);
  };

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const { data, error } = await supabase.rpc('rpc_create_video_request');
      if (error) {
        toast({ title: 'No se pudo crear la solicitud', description: error.message });
        return;
      }
      toast({ title: 'Solicitud creada', description: `ID: ${data}` });
    } finally {
      setGenerating(false);
    }
  };
  return (
    <>
      <SEO
        title="Generador de Videos UGC | Dashboard"
        description="Métricas mock, créditos y generación de videos UGC con doble aprobación."
        canonical="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "UGC Flow",
          applicationCategory: "VideoCreation",
          offers: { "@type": "Offer", price: "Subscription" },
        }}
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div
          className="surface-card rounded-xl p-6 border border-border interactive-spotlight"
          onMouseMove={onMove}
        >
          <h1 className="text-2xl font-semibold mb-2">Genera videos UGC on‑demand</h1>
          <p className="text-muted-foreground mb-4">
            Flujo con créditos, doble aprobación y exportación a IG/YouTube.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="brand" onClick={handleGenerate} disabled={generating} aria-busy={generating}>
              <Sparkles className="mr-2" /> {generating ? 'Generando…' : 'Generar video'}
            </Button>
            <Button variant="hero" asChild>
              <a href="#videos"> <Film className="mr-2" /> Ver mis videos</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/branding"> <UploadCloud className="mr-2" /> Subir assets</a>
            </Button>
          </div>
        </div>
        <div className="rounded-xl p-6 border border-border bg-secondary/20">
          <h2 className="text-lg font-medium mb-4">Métricas (mock)</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-3xl font-bold">12</div>
              <div className="text-xs text-muted-foreground">Videos listos</div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-3xl font-bold">4</div>
              <div className="text-xs text-muted-foreground">En edición</div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-3xl font-bold">1.2k</div>
              <div className="text-xs text-muted-foreground">Vistas estimadas</div>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <div className="text-3xl font-bold">3.4%</div>
              <div className="text-xs text-muted-foreground">CTR estimado</div>
            </div>
          </div>
        </div>
      </section>

      <section id="videos" className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Últimas solicitudes</h2>
          <Button variant="ghost" asChild>
            <a href="/videos">Ver todo</a>
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {["PRE_REVIEW_PENDING", "EDITING", "READY"].map((s, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="text-sm text-muted-foreground">Estado</div>
              <div className="font-semibold mb-2">{s}</div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/videos/${i + 1}`}>Abrir detalle</a>
              </Button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default Dashboard;
