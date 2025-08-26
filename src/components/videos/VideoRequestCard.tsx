import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VideoRequest } from "@/hooks/useVideoRequests";
import { Play, Clock, CheckCircle2, AlertCircle, Loader2, Video } from "lucide-react";

interface VideoRequestCardProps {
  videoRequest: VideoRequest;
  onPlayVideo: (videoRequest: VideoRequest) => void;
}

const statusConfig = {
  QUEUED: {
    label: 'En Cola',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    animate: false
  },
  IDEATION: {
    label: 'Ideación',
    icon: Loader2,
    variant: 'secondary' as const,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    animate: true
  },
  PRE_REVIEW_PENDING: {
    label: 'Revisión Previa',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    animate: false
  },
  PRE_APPROVED: {
    label: 'Pre-Aprobado',
    icon: CheckCircle2,
    variant: 'secondary' as const,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    animate: false
  },
  GENERATING: {
    label: 'Generando',
    icon: Loader2,
    variant: 'secondary' as const,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    animate: true
  },
  EDITING: {
    label: 'Editando',
    icon: Loader2,
    variant: 'secondary' as const,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    animate: true
  },
  POST_REVIEW_PENDING: {
    label: 'Revisión Post',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    animate: false
  },
  POST_APPROVED: {
    label: 'Post-Aprobado',
    icon: CheckCircle2,
    variant: 'secondary' as const,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    animate: false
  },
  READY: {
    label: 'Listo',
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    animate: false
  },
  EXPORTED: {
    label: 'Exportado',
    icon: CheckCircle2,
    variant: 'default' as const,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    animate: false
  },
  FAILED: {
    label: 'Falló',
    icon: AlertCircle,
    variant: 'destructive' as const,
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    animate: false
  }
};

export function VideoRequestCard({ videoRequest, onPlayVideo }: VideoRequestCardProps) {
  const config = statusConfig[videoRequest.status];
  const StatusIcon = config.icon;
  const hasVideo = videoRequest.assets?.some(asset => asset.kind === 'edited_video' && asset.signed_url);
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstimatedTime = () => {
    if (['GENERATING', 'EDITING'].includes(videoRequest.status)) {
      return '2-4 min restantes';
    }
    if (['QUEUED', 'IDEATION'].includes(videoRequest.status)) {
      return '~5 min total';
    }
    return null;
  };

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${config.bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">#{videoRequest.id.slice(-8)}</span>
          </div>
          <Badge variant={config.variant} className="flex items-center gap-1">
            <StatusIcon 
              className={`h-3 w-3 ${config.animate ? 'animate-spin' : ''}`} 
            />
            {config.label}
          </Badge>
        </div>

        <div className="space-y-2 mb-4">
          <div className="text-xs text-muted-foreground">
            Creado: {formatDate(videoRequest.created_at)}
          </div>
          {videoRequest.updated_at !== videoRequest.created_at && (
            <div className="text-xs text-muted-foreground">
              Actualizado: {formatDate(videoRequest.updated_at)}
            </div>
          )}
          {getEstimatedTime() && (
            <div className="text-xs text-blue-600 font-medium">
              {getEstimatedTime()}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          {hasVideo && videoRequest.status === 'READY' ? (
            <Button 
              size="sm" 
              onClick={() => onPlayVideo(videoRequest)}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Ver Video
            </Button>
          ) : videoRequest.status === 'FAILED' ? (
            <Button 
              size="sm" 
              variant="outline"
              disabled
            >
              Error en procesamiento
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline"
              disabled
            >
              <StatusIcon 
                className={`mr-2 h-4 w-4 ${config.animate ? 'animate-spin' : ''}`} 
              />
              Procesando...
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}