import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WebhookLog } from '@/hooks/useWebhookLogs';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

interface WebhookDetailProps {
  webhook: WebhookLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookDetail({ webhook, open, onOpenChange }: WebhookDetailProps) {
  const { toast } = useToast();
  const [replayLoading, setReplayLoading] = useState(false);

  if (!webhook) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado', description: 'Contenido copiado al portapapeles' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const formatJson = (obj: any) => {
    if (!obj) return 'N/A';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const handleReplay = async () => {
    if (!webhook.payload || webhook.direction !== 'incoming') {
      toast({
        title: 'Error',
        description: 'Solo se pueden reproducir webhooks entrantes con payload válido',
        variant: 'destructive'
      });
      return;
    }

    try {
      setReplayLoading(true);
      const { data, error } = await supabase.functions.invoke('receive_video_webhook', {
        body: webhook.payload
      });

      if (error) throw error;

      toast({
        title: 'Webhook reproducido',
        description: 'El webhook se ha enviado nuevamente'
      });
    } catch (error: any) {
      toast({
        title: 'Error al reproducir webhook',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setReplayLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!webhook.status) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (webhook.status >= 200 && webhook.status < 300) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusBadge = () => {
    if (!webhook.status) return <Badge variant="destructive">Error</Badge>;
    if (webhook.status >= 200 && webhook.status < 300) return <Badge variant="default">{webhook.status}</Badge>;
    return <Badge variant="destructive">{webhook.status}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Webhook #{webhook.id.slice(-8)}
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Información General</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">DIRECCIÓN</p>
                  <Badge variant={webhook.direction === 'incoming' ? 'default' : 'secondary'}>
                    {webhook.direction === 'incoming' ? 'Entrante' : 'Saliente'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">EVENTO</p>
                  <p className="text-sm font-medium">{webhook.event_type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">FECHA</p>
                  <p className="text-xs">{formatDate(webhook.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">TIEMPO EJECUCIÓN</p>
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    {webhook.execution_time_ms ? `${webhook.execution_time_ms}ms` : 'N/A'}
                  </div>
                </div>
              </div>

              {webhook.request_id && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-1">REQUEST ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {webhook.request_id}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(webhook.request_id!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for detailed info */}
          <Tabs defaultValue="payload">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="payload">Payload</TabsTrigger>
              <TabsTrigger value="response">Respuesta</TabsTrigger>
              <TabsTrigger value="error">Error</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>

            <TabsContent value="payload">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Payload de Entrada</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(formatJson(webhook.payload))}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copiar
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {formatJson(webhook.payload)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="response">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Datos de Respuesta</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(formatJson(webhook.response_data))}
                  >
                    <Copy className="mr-2 h-3 w-3" />
                    Copiar
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-96">
                    {formatJson(webhook.response_data)}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="error">
              <Card>
                <CardHeader>
                  <CardTitle>Información de Error</CardTitle>
                </CardHeader>
                <CardContent>
                  {webhook.error ? (
                    <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                      <p className="text-sm text-destructive font-medium">{webhook.error}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No hay errores registrados</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metadata">
              <Card>
                <CardHeader>
                  <CardTitle>Metadata Técnica</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">ID</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{webhook.id}</code>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">PROVIDER</p>
                      <p className="text-sm">{webhook.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">TAMAÑO REQUEST</p>
                      <p className="text-sm">
                        {webhook.request_size_bytes ? `${Math.round(webhook.request_size_bytes / 1024)}KB` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">IDEMPOTENCY KEY</p>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {webhook.idempotency_key || 'N/A'}
                      </code>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            
            {webhook.direction === 'incoming' && webhook.payload && (
              <Button
                onClick={handleReplay}
                disabled={replayLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${replayLoading ? 'animate-spin' : ''}`} />
                Reproducir Webhook
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}