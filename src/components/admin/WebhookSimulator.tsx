import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Upload, Play, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WEBHOOK_TYPES } from '@/lib/types/webhook';

interface MockPayload {
  request_id: string;
  status: 'completed' | 'failed';
  video_base64?: string;
  metadata?: {
    duration?: number;
    format?: string;
    resolution?: string;
  };
  failure_reason?: string;
}

export function WebhookSimulator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [payloadType, setPayloadType] = useState<'success' | 'failure'>('success');
  const [requestId, setRequestId] = useState('');
  const [duration, setDuration] = useState('30');
  const [resolution, setResolution] = useState('1920x1080');
  const [failureReason, setFailureReason] = useState('Processing timeout');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoBase64, setVideoBase64] = useState('');
  const [payloadPreview, setPayloadPreview] = useState('');
  
  // Available video requests for testing
  const [videoRequests, setVideoRequests] = useState<Array<{id: string, status: string, created_at: string}>>([]);

  useEffect(() => {
    loadVideoRequests();
  }, []);

  const loadVideoRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('video_requests')
        .select('id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setVideoRequests(data || []);
    } catch (error) {
      console.error('Error loading video requests:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Error',
        description: 'Por favor selecciona un archivo de video válido',
        variant: 'destructive'
      });
      return;
    }

    // Check file size (max 10MB for demo)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo debe ser menor a 10MB para el simulador',
        variant: 'destructive'
      });
      return;
    }

    setVideoFile(file);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1]; // Remove data:video/mp4;base64, prefix
      setVideoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const buildPayload = (): MockPayload => {
    const base: MockPayload = {
      request_id: requestId,
      status: payloadType === 'success' ? 'completed' : 'failed',
    };

    if (payloadType === 'success') {
      base.video_base64 = videoBase64 || 'dGVzdC1tb2NrLXZpZGVvLWRhdGE='; // Mock base64
      base.metadata = {
        duration: parseInt(duration) || 30,
        format: 'mp4',
        resolution: resolution
      };
    } else {
      base.failure_reason = failureReason;
    }

    return base;
  };

  useEffect(() => {
    const payload = buildPayload();
    setPayloadPreview(JSON.stringify(payload, null, 2));
  }, [payloadType, requestId, duration, resolution, failureReason, videoBase64]);

  const sendWebhook = async () => {
    if (!requestId) {
      toast({
        title: 'Error',
        description: 'Selecciona un Request ID válido',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      const payload = buildPayload();

      console.log('Sending webhook payload:', payload);

      // Log outgoing webhook from admin panel
      await supabase.from('webhook_logs').insert({
        direction: 'outgoing',
        event_type: WEBHOOK_TYPES.ADMIN_TEST,
        status: 0, // Will be updated after response
        payload: JSON.parse(JSON.stringify(payload)), // Ensure JSON compatibility
        provider: 'admin_simulator',
        idempotency_key: crypto.randomUUID(),
        request_id: payload.request_id
      });

      const { data, error } = await supabase.functions.invoke('receive_video_webhook', {
        body: payload
      });

      if (error) throw error;

      toast({
        title: 'Webhook enviado',
        description: `Webhook ${payloadType} enviado correctamente`,
      });

      // Refresh video requests list
      loadVideoRequests();

    } catch (error: any) {
      console.error('Webhook error:', error);
      toast({
        title: 'Error al enviar webhook',
        description: error.message || 'Error desconocido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMockRequestId = async () => {
    try {
      // Create a new test video request
      const { data, error } = await supabase.functions.invoke('create_video_request', {
        body: { test_mode: true }
      });

      if (error) throw error;

      if (data?.request_id) {
        setRequestId(data.request_id);
        loadVideoRequests(); // Refresh the list
        toast({
          title: 'Request creado',
          description: `Nuevo request de prueba: ${data.request_id.slice(-8)}`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error creando request de prueba',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Simulador de Webhooks N8N</CardTitle>
          <p className="text-sm text-muted-foreground">
            Simula webhooks de N8N para probar el procesamiento de videos
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Request Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="request-select">Video Request</Label>
                <Select value={requestId} onValueChange={setRequestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un request ID" />
                  </SelectTrigger>
                  <SelectContent>
                    {videoRequests.map((request) => (
                      <SelectItem key={request.id} value={request.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>#{request.id.slice(-8)}</span>
                          <Badge variant="secondary" className="ml-2">
                            {request.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={generateMockRequestId}>
                  <Play className="mr-2 h-4 w-4" />
                  Crear Request de Prueba
                </Button>
              </div>
            </div>

            {/* Payload Type */}
            <div>
              <Label>Tipo de Payload</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={payloadType === 'success' ? 'default' : 'outline'}
                  onClick={() => setPayloadType('success')}
                  size="sm"
                >
                  Éxito (completed)
                </Button>
                <Button
                  variant={payloadType === 'failure' ? 'default' : 'outline'}
                  onClick={() => setPayloadType('failure')}
                  size="sm"
                >
                  Fallo (failed)
                </Button>
              </div>
            </div>

            {/* Conditional fields based on payload type */}
            <Tabs value={payloadType} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="success">Configuración Éxito</TabsTrigger>
                <TabsTrigger value="failure">Configuración Fallo</TabsTrigger>
              </TabsList>

              <TabsContent value="success" className="space-y-4">
                {/* Video Upload */}
                <div>
                  <Label htmlFor="video-upload">Video (Opcional)</Label>
                  <div className="mt-1">
                    <Input
                      id="video-upload"
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                    />
                    {videoFile && (
                      <div className="mt-2 p-2 bg-muted rounded flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">{videoFile.name}</span>
                        <Badge variant="secondary">
                          {Math.round(videoFile.size / 1024)}KB
                        </Badge>
                      </div>
                    )}
                    {!videoFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Si no subes video, se usará un base64 de prueba
                      </p>
                    )}
                  </div>
                </div>

                {/* Video Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duration">Duración (segundos)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="resolution">Resolución</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1920x1080">1920x1080 (FHD)</SelectItem>
                        <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                        <SelectItem value="854x480">854x480 (SD)</SelectItem>
                        <SelectItem value="640x360">640x360 (Low)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="failure" className="space-y-4">
                <div>
                  <Label htmlFor="failure-reason">Razón del Fallo</Label>
                  <Input
                    id="failure-reason"
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="Describe la razón del fallo"
                  />
                </div>

                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Simulación de Fallo</p>
                    <p className="text-xs text-destructive/80">
                      Esto marcará el video request como FAILED y registrará la razón
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Payload Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview del Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-64">
            {payloadPreview}
          </pre>
        </CardContent>
      </Card>

      {/* Send Action */}
      <div className="flex justify-end">
        <Button onClick={sendWebhook} disabled={loading || !requestId}>
          <Send className={`mr-2 h-4 w-4 ${loading ? 'animate-pulse' : ''}`} />
          {loading ? 'Enviando...' : 'Enviar Webhook'}
        </Button>
      </div>
    </div>
  );
}