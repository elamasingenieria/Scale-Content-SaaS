import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw, Search, Activity, AlertCircle, CheckCircle } from 'lucide-react';
import { useWebhookLogs, type WebhookLog } from '@/hooks/useWebhookLogs';
import { WebhookDetail } from './WebhookDetail';

export function WebhookMonitor() {
  const [direction, setDirection] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [status, setStatus] = useState<'all' | 'success' | 'error'>('all');
  const [eventType, setEventType] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookLog | null>(null);

  const { webhookLogs, loading, stats, refetch } = useWebhookLogs({
    direction,
    status,
    eventType,
    autoRefresh
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusBadge = (log: WebhookLog) => {
    if (!log.status) {
      return <Badge variant="destructive">Error</Badge>;
    }
    if (log.status >= 200 && log.status < 300) {
      return <Badge variant="default">{log.status}</Badge>;
    }
    return <Badge variant="destructive">{log.status}</Badge>;
  };

  const getDirectionBadge = (direction: string) => {
    return (
      <Badge variant={direction === 'incoming' ? 'default' : 'secondary'}>
        {direction === 'incoming' ? 'Entrante' : 'Saliente'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">TOTAL</p>
                  <p className="text-lg font-semibold">{stats.total}</p>
                </div>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">EXITOSOS</p>
                  <p className="text-lg font-semibold text-green-600">{stats.successful}</p>
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
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">TIEMPO PROM.</p>
                <p className="text-lg font-semibold">
                  {Math.round(stats.averageResponseTime || 0)}ms
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Monitor de Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="direction-filter">Dirección</Label>
              <Select value={direction} onValueChange={(value: any) => setDirection(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="incoming">Entrantes</SelectItem>
                  <SelectItem value="outgoing">Salientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Estado</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Exitosos</SelectItem>
                  <SelectItem value="error">Con errores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="event-filter">Tipo de evento</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="event-filter"
                  placeholder="Filtrar por evento..."
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
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
            <Label htmlFor="auto-refresh">Auto-actualizar (5s)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Webhooks Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Tiempo</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead>Tamaño</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    Cargando webhooks...
                  </TableCell>
                </TableRow>
              ) : webhookLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No se encontraron webhooks con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                webhookLogs.map((log) => (
                  <TableRow 
                    key={log.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedWebhook(log)}
                  >
                    <TableCell className="font-mono text-xs">
                      {formatDate(log.created_at)}
                    </TableCell>
                    <TableCell>
                      {getDirectionBadge(log.direction)}
                    </TableCell>
                    <TableCell className="max-w-32 truncate">
                      {log.event_type || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.execution_time_ms ? `${log.execution_time_ms}ms` : 'N/A'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.request_id ? log.request_id.slice(-8) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.request_size_bytes ? `${Math.round(log.request_size_bytes / 1024)}KB` : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Webhook Detail Modal */}
      <WebhookDetail 
        webhook={selectedWebhook}
        open={!!selectedWebhook}
        onOpenChange={(open) => !open && setSelectedWebhook(null)}
      />
    </div>
  );
}