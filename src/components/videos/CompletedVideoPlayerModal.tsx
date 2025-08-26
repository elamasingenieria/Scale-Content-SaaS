import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';
import { UserFile } from '@/hooks/useUserFiles';

interface CompletedVideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userFile: UserFile | null;
}

export function CompletedVideoPlayerModal({ isOpen, onClose, userFile }: CompletedVideoPlayerModalProps) {
  if (!userFile) return null;

  const handleDownload = () => {
    window.open(userFile.public_url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Video Completado</span>
            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                size="sm"
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar
              </Button>
              
              <Button
                onClick={handleDownload}
                size="sm"
                variant="ghost"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={userFile.public_url}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          >
            Tu navegador no soporta el elemento de video.
          </video>
        </div>
        
        <div className="text-sm text-muted-foreground mt-4">
          <p>Completado: {new Date(userFile.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          {userFile.request_id && (
            <p>ID de solicitud: {userFile.request_id}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}