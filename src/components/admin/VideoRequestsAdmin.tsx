import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Search, Video, CheckCircle, XCircle, Clock, Download, Eye, RotateCcw } from 'lucide-react';
import { useAdminVideoRequests, type AdminVideoRequest } from '@/hooks/useAdminVideoRequests';
import { VideoPlayerModal } from '@/components/videos/VideoPlayerModal';
import { VideoRequest } from '@/hooks/useVideoRequests';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function VideoRequestsAdmin() {
  const { toast } = useToast();
  const [status, setStatus] = useState('all');
  const [userEmail, setUserEmail] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedVideoRequest, setSelectedVideoRequest] = useState<VideoRequest | null>(null);

  const { videoRequests, loading, stats, refetch } = useAdminVideoRequests({
    status,
    userEmail,
    autoRefresh
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'QUEUED': 'secondary',
      'PROCESSING': 'default',
      'IDEATION': 'default', 
      'GENERATING': 'default',
      'EDITING': 'default',
      'READY': 'default',
      'FAILED': 'destructive',
      'EXPORTED': 'secondary'
    };

    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  const handlePlayVideo = (request: AdminVideoRequest) => {
    // Convert AdminVideoRequest to VideoRequest format
    const videoRequest: VideoRequest = {
      id: request.id,
      user_id: request.user_id,
      status: request.status,
      created_at: request.created_at,
      updated_at: request.updated_at,
      assets: request.assets as any // Type assertion since formats are compatible
    };
    setSelectedVideoRequest(videoRequest);
  };

  const handleRetry = async (requestId: string) => {
    try {
      // Reset status to QUEUED for retry
      const { error } = await supabase
        .from('video_requests')
        .update({ 
          status: 'QUEUED',
          failure_count: 0,
          failure_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request reiniciado',
        description: 'El video request ha sido marcado como QUEUED para reintento'
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error al reintentar',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleMarkAsProcessed = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('video_requests')
        .update({ 
          status: 'READY',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: 'Request marcado como procesado',
        description: 'El estado ha sido actualizado a READY'
      });

      refetch();
    } catch (error: any) {
      toast({
        title: 'Error al actualizar estado',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleDownloadAssets = async (request: AdminVideoRequest) => {
    const videoAsset = request.assets?.find(asset => asset.kind === 'edited_video');
    if (!videoAsset?.signed_url) {
      toast({
        title: 'No disponible',
        description: 'No hay video disponible para descargar',
        variant: 'destructive'
      });
      return;
    }

    const link = document.createElement('a');
    link.href = videoAsset.signed_url;
    link.download = `video-${request.id.slice(-8)}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">TOTAL</p>
                  <p className="text-lg font-semibold">{stats.total}</p>
                </div>
                <Video className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">EN COLA</p>
                  <p className="text-lg font-semibold text-blue-600">{stats.queued}</p>
                </div>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">PROCESANDO</p>
                  <p className="text-lg font-semibold text-orange-600">{stats.processing}</p>
                </div>
                <RefreshCw className="h-4 w-4 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">LISTOS</p>
                  <p className="text-lg font-semibold text-green-600">{stats.ready}</p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">FALLIDOS</p>
                  <p className="text-lg font-semibold text-red-600">{stats.failed}</p>
                </div>
                <XCircle className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Video Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="status-filter">Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="QUEUED">En cola</SelectItem>
                  <SelectItem value="IDEATION">Ideación</SelectItem>
                  <SelectItem value="GENERATING">Generando</SelectItem>
                  <SelectItem value="EDITING">Editando</SelectItem>
                  <SelectItem value="READY">Listo</SelectItem>
                  <SelectItem value="FAILED">Fallido</SelectItem>
                  <SelectItem value="EXPORTED">Exportado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="email-filter">Email del usuario</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email-filter"
                  placeholder="Filtrar por email..."
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={() => refetch()} disabled={loading} variant="outline">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh">Auto-actualizar (30s)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Video Requests Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Último Webhook</TableHead>
                <TableHead>Fallos</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Cargando video requests...
                  </TableCell>
                </TableRow>
              ) : videoRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No se encontraron video requests con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                videoRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-mono text-xs">
                      #{request.id.slice(-8)}
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
                      {request.user_email || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(request.status)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {formatDate(request.created_at)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {request.last_webhook_received_at ? 
                        formatDate(request.last_webhook_received_at) : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {request.failure_count ? (
                        <Badge variant="destructive">{request.failure_count}</Badge>
                      ) : (
                        <Badge variant="secondary">0</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Play video if available */}
                        {request.assets?.some(asset => asset.kind === 'edited_video' && asset.signed_url) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePlayVideo(request)}
                            title="Ver video"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}

                        {/* Download video */}
                        {request.assets?.some(asset => asset.kind === 'edited_video' && asset.signed_url) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadAssets(request)}
                            title="Descargar"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}

                        {/* Retry failed requests */}
                        {request.status === 'FAILED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRetry(request.id)}
                            title="Reintentar"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}

                        {/* Mark as processed for stuck requests */}
                        {['QUEUED', 'IDEATION', 'GENERATING', 'EDITING'].includes(request.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsProcessed(request.id)}
                            title="Marcar como procesado"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Video Player Modal */}
      <VideoPlayerModal 
        videoRequest={selectedVideoRequest}
        open={!!selectedVideoRequest}
        onOpenChange={(open) => !open && setSelectedVideoRequest(null)}
      />
    </div>
  );
}