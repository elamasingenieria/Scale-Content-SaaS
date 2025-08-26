import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Clock, Maximize2 } from "lucide-react";
import { VideoRequest } from "@/hooks/useVideoRequests";

interface VideoPlayerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoRequest: VideoRequest | null;
}

export function VideoPlayerModal({ open, onOpenChange, videoRequest }: VideoPlayerModalProps) {
  if (!videoRequest) return null;

  const videoAsset = videoRequest.assets?.find(asset => asset.kind === 'edited_video');
  const videoUrl = videoAsset?.signed_url;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `video-${videoRequest.id.slice(-8)}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Video #{videoRequest.id.slice(-8)}
              <Badge variant="secondary">{videoRequest.status}</Badge>
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {formatDate(videoRequest.created_at)}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 space-y-4">
          {/* Video Player */}
          {videoUrl ? (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                src={videoUrl}
                controls
                className="w-full h-auto max-h-[60vh]"
                preload="metadata"
              >
                Tu navegador no soporta la reproducción de videos.
              </video>
            </div>
          ) : (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-muted-foreground mb-2">Video no disponible</div>
                <div className="text-xs text-muted-foreground">
                  El video aún no ha sido procesado o hay un problema con el enlace
                </div>
              </div>
            </div>
          )}

          {/* Video Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">ESTADO</div>
              <Badge variant={videoRequest.status === 'READY' ? 'default' : 'secondary'}>
                {videoRequest.status}
              </Badge>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">CREADO</div>
              <div className="text-sm">{formatDate(videoRequest.created_at)}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">ACTUALIZADO</div>
              <div className="text-sm">{formatDate(videoRequest.updated_at)}</div>
            </div>
          </div>

          {/* Video Metadata */}
          {videoAsset?.metadata && (
            <div className="p-4 bg-secondary/50 rounded-lg">
              <div className="text-sm font-medium mb-2">Información del video</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {videoAsset.metadata.duration && (
                  <div>
                    <span className="text-muted-foreground">Duración:</span>
                    <div className="font-medium">{videoAsset.metadata.duration}s</div>
                  </div>
                )}
                {videoAsset.metadata.format && (
                  <div>
                    <span className="text-muted-foreground">Formato:</span>
                    <div className="font-medium uppercase">{videoAsset.metadata.format}</div>
                  </div>
                )}
                {videoAsset.metadata.resolution && (
                  <div>
                    <span className="text-muted-foreground">Resolución:</span>
                    <div className="font-medium">{videoAsset.metadata.resolution}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
            
            <div className="flex gap-2">
              {videoUrl && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(videoUrl, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir en nueva pestaña
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}