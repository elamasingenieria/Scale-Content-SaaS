import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const Videos = () => {
  return (
    <>
      <SEO
        title="Mis Videos | UGC Flow"
        description="Lista de solicitudes y estados de generación de videos UGC."
        canonical="/videos"
      />
      <h1 className="text-xl font-semibold mb-4">Mis Videos</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="text-sm text-muted-foreground">Solicitud</div>
            <div className="font-semibold">#{i + 1}</div>
            <div className="text-xs text-muted-foreground mb-3">PRE_REVIEW_PENDING</div>
            <Button variant="outline" size="sm" asChild>
              <a href={`/videos/${i + 1}`}>Ver detalle</a>
            </Button>
          </div>
        ))}
      </div>
    </>
  );
};

export default Videos;
