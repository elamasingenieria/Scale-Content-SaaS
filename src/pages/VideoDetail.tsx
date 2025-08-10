import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";

const VideoDetail = () => {
  return (
    <>
      <SEO
        title="Detalle de Video | UGC Flow"
        description="Aprobación pre/post edición y exportación."
        canonical="/videos/:id"
      />
      <h1 className="text-xl font-semibold mb-3">Detalle de Video</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-xl border border-border p-4">
          <div className="aspect-video rounded bg-secondary/20 mb-3" />
          <div className="flex gap-2">
            <Button variant="brand">Aprobar pre</Button>
            <Button variant="outline">Rechazar</Button>
            <Button variant="ghost">Solicitar cambios</Button>
          </div>
        </div>
        <div className="rounded-xl border border-border p-4">
          <h2 className="font-medium mb-2">Exportar</h2>
          <div className="flex gap-2">
            <Button variant="brand">Instagram</Button>
            <Button variant="secondary">YouTube</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default VideoDetail;
