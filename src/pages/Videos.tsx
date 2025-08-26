import { useState } from 'react';
import { useVideoRequests, VideoRequest } from '@/hooks/useVideoRequests';
import { useUserFiles, UserFile } from '@/hooks/useUserFiles';
import { VideoRequestCard } from '@/components/videos/VideoRequestCard';
import { CompletedVideoCard } from '@/components/videos/CompletedVideoCard';
import { VideoPlayerModal } from '@/components/videos/VideoPlayerModal';
import { CompletedVideoPlayerModal } from '@/components/videos/CompletedVideoPlayerModal';
import SEO from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Video, Clock, CheckCircle, Loader2 } from 'lucide-react';

const Videos = () => {
  const { videoRequests, loading: loadingRequests, error: errorRequests, refetch: refetchRequests } = useVideoRequests();
  const { userFiles, loading: loadingFiles, error: errorFiles, refetch: refetchFiles } = useUserFiles();
  const [selectedVideo, setSelectedVideo] = useState<VideoRequest | null>(null);
  const [selectedFile, setSelectedFile] = useState<UserFile | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);

  const handlePlayVideo = (videoRequest: VideoRequest) => {
    setSelectedVideo(videoRequest);
    setIsVideoModalOpen(true);
  };

  const handlePlayFile = (userFile: UserFile) => {
    setSelectedFile(userFile);
    setIsFileModalOpen(true);
  };

  const handleRefresh = async () => {
    await Promise.all([refetchRequests(), refetchFiles()]);
  };

  const loading = loadingRequests || loadingFiles;
  const error = errorRequests || errorFiles;

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

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Todos ({videoRequests.length + userFiles.length})
          </TabsTrigger>
          <TabsTrigger value="processing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            En Proceso ({videoRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Completados ({userFiles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {loading && videoRequests.length === 0 && userFiles.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Cargando tus videos...</span>
              </div>
            </div>
          ) : videoRequests.length === 0 && userFiles.length === 0 ? (
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
              {userFiles.map((userFile) => (
                <CompletedVideoCard
                  key={userFile.id}
                  userFile={userFile}
                  onPlayVideo={handlePlayFile}
                />
              ))}
              {videoRequests.map((videoRequest) => (
                <VideoRequestCard
                  key={videoRequest.id}
                  videoRequest={videoRequest}
                  onPlayVideo={handlePlayVideo}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          {loading && videoRequests.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Cargando videos...</span>
              </div>
            </div>
          ) : videoRequests.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No hay videos en proceso</h2>
              <p className="text-muted-foreground mb-4">
                Todos tus videos están completados o aún no has solicitado ninguno.
              </p>
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
        </TabsContent>

        <TabsContent value="completed" className="space-y-6">
          {loading && userFiles.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-muted-foreground">Cargando videos...</span>
              </div>
            </div>
          ) : userFiles.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">No hay videos completados</h2>
              <p className="text-muted-foreground mb-4">
                Los videos completados aparecerán aquí una vez que estén listos.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userFiles.map((userFile) => (
                <CompletedVideoCard
                  key={userFile.id}
                  userFile={userFile}
                  onPlayVideo={handlePlayFile}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <VideoPlayerModal
        open={isVideoModalOpen}
        onOpenChange={setIsVideoModalOpen}
        videoRequest={selectedVideo}
      />

      <CompletedVideoPlayerModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        userFile={selectedFile}
      />
    </>
  );
};

export default Videos;