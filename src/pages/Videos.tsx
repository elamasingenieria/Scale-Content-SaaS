import { useState } from "react";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { VideoRequestCard } from "@/components/videos/VideoRequestCard";
import { VideoPlayerModal } from "@/components/videos/VideoPlayerModal";
import { useVideoRequests, VideoRequest } from "@/hooks/useVideoRequests";
import { Loader2, Video, RefreshCw } from "lucide-react";

const Videos = () => {
  const { videoRequests, loading, error, refetch } = useVideoRequests();
  const [selectedVideo, setSelectedVideo] = useState<VideoRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlayVideo = (videoRequest: VideoRequest) => {
    setSelectedVideo(videoRequest);
    setIsModalOpen(true);
  };

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <>
        <SEO
          title="Mis Videos | UGC Flow"
          description="Lista de solicitudes y estados de generación de videos UGC."
          canonical="/videos"
        />
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-destructive mb-2">Error al cargar videos</h2>
            <p className="text-muted-foreground mb-4">
              No se pudieron cargar tus solicitudes de video
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Mis Videos | UGC Flow"
        description="Lista de solicitudes y estados de generación de videos UGC."
        canonical="/videos"
      />
      
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Mis Videos</h1>
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {loading && videoRequests.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-muted-foreground">Cargando tus videos...</span>
          </div>
        </div>
      ) : videoRequests.length === 0 ? (
        <div className="text-center py-12">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No tienes videos aún</h2>
          <p className="text-muted-foreground mb-4">
            Completa tus formularios y genera tu primer video UGC
          </p>
          <Button asChild>
            <a href="/formularios">Completar formularios</a>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {videoRequests.map((videoRequest) => (
            <VideoRequestCard
              key={videoRequest.id}
              videoRequest={videoRequest}
              onPlayVideo={handlePlayVideo}
            />
          ))}
        </div>
      )}

      <VideoPlayerModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        videoRequest={selectedVideo}
      />
    </>
  );
};

export default Videos;
