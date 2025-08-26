import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Download, ExternalLink } from 'lucide-react';
import { UserFile } from '@/hooks/useUserFiles';

interface CompletedVideoCardProps {
  userFile: UserFile;
  onPlayVideo: (userFile: UserFile) => void;
}

export function CompletedVideoCard({ userFile, onPlayVideo }: CompletedVideoCardProps) {
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
    window.open(userFile.public_url, '_blank');
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Video Completado
          </CardTitle>
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Listo
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>Completado: {formatDate(userFile.created_at)}</p>
          {userFile.request_id && (
            <p>ID de solicitud: {userFile.request_id.slice(0, 8)}...</p>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => onPlayVideo(userFile)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Ver Video
          </Button>
          
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
      </CardContent>
    </Card>
  );
}