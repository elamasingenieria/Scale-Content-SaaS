import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAdminData } from "@/hooks/useAdminData";
import { useAdminTools } from "@/hooks/useAdminTools";
import { useStripeEvents } from "@/hooks/useStripeEvents";
import { WebhookMonitor } from "@/components/admin/WebhookMonitor";
import { VideoRequestsAdmin } from "@/components/admin/VideoRequestsAdmin";

const canonical = "/admin";

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdminRole();

  // Data filters
  const [searchEmail, setSearchEmail] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Custom hooks for functionality
  const {
    webhookLogs,
    payments,
    userIntakes,
    loadingData,
    loadWebhookLogs,
    loadPayments,
    loadUserIntakes,
  } = useAdminData();

  const {
    email,
    setEmail,
    grantAmount,
    setGrantAmount,
    grantLoading,
    grantCredits,
    n8nBody,
    setN8nBody,
    n8nLoading,
    sendN8n,
  } = useAdminTools();

  const {
    eventType,
    setEventType,
    customerEmail,
    setCustomerEmail,
    creditsPack,
    setCreditsPack,
    amountCents,
    setAmountCents,
    payloadPreview,
    sendingMock,
    sendMockEvent,
  } = useStripeEvents();

  // Redirect non-admin users
  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast({
        title: "Acceso denegado",
        description: "Se requieren permisos de administrador",
        variant: "destructive"
      });
      navigate("/");
    }
  }, [adminLoading, isAdmin, toast, navigate]);

  // Load initial data
  useEffect(() => {
    if (isAdmin && !adminLoading) {
      loadWebhookLogs(statusFilter);
      loadPayments();
      loadUserIntakes(searchEmail);
    }
  }, [isAdmin, adminLoading, statusFilter, searchEmail, loadWebhookLogs, loadPayments, loadUserIntakes]);

  // Show loading while checking permissions
  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-muted-foreground">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Don't render admin content if not admin
  if (!isAdmin) {
    return null;
  }

  const n8nUrl = "https://devwebhookn8n.ezequiellamas.com/webhook/f4914fae-9e10-442f-88bc-f80ee2a5f244";

  return (
    <>
      <SEO
        title="Admin Dashboard – UGC Flow"
        description="Panel de administración: créditos, Stripe MOCK y pruebas de webhooks."
        canonical={canonical}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "UGC Flow Admin",
          applicationCategory: "BusinessApplication",
        }}
      />

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Gestión de créditos, pruebas de Stripe (MOCK) y webhook n8n.</p>
      </header>

      <Tabs defaultValue="tools" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tools">Herramientas</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="videos">Video Requests</TabsTrigger>
          <TabsTrigger value="data">Datos</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Asignación de créditos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="grant-email">Email del usuario</Label>
                  <Input 
                    id="grant-email" 
                    placeholder="user@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="grant-amount">Cantidad</Label>
                  <Input
                    id="grant-amount"
                    type="number"
                    min={1}
                    value={grantAmount}
                    onChange={(e) => setGrantAmount(parseInt(e.target.value || "0", 10))}
                  />
                </div>
                <Button onClick={grantCredits} disabled={grantLoading || !email || grantAmount <= 0}>
                  {grantLoading ? "Acreditando..." : "Acreditar"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test webhook n8n</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2">
                  <Label>Endpoint</Label>
                  <Input value={n8nUrl} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>Body</Label>
                  <Textarea rows={8} value={n8nBody} onChange={(e) => setN8nBody(e.target.value)} />
                </div>
                <Button onClick={sendN8n} disabled={n8nLoading}>
                  {n8nLoading ? "Enviando..." : "Enviar a n8n"}
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Emisor de eventos Stripe (MOCK)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label>Tipo de evento</Label>
                    <Select value={eventType} onValueChange={setEventType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checkout.session.completed">checkout.session.completed</SelectItem>
                        <SelectItem value="invoice.paid">invoice.paid</SelectItem>
                        <SelectItem value="charge.refunded">charge.refunded</SelectItem>
                        <SelectItem value="invoice.payment_refunded">invoice.payment_refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Email cliente</Label>
                    <Input 
                      placeholder="user@example.com" 
                      value={customerEmail} 
                      onChange={(e) => setCustomerEmail(e.target.value)} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Créditos (pack)</Label>
                    <Input 
                      type="number" 
                      min={0} 
                      value={creditsPack} 
                      onChange={(e) => setCreditsPack(parseInt(e.target.value || "0", 10))} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Monto (cents)</Label>
                    <Input 
                      type="number" 
                      min={0} 
                      value={amountCents} 
                      onChange={(e) => setAmountCents(parseInt(e.target.value || "0", 10))} 
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    variant="secondary" 
                    onClick={() => { 
                      setEventType("checkout.session.completed"); 
                      setCreditsPack(10); 
                      setAmountCents(1000); 
                    }}
                  >
                    Pack 10
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => { 
                      setEventType("checkout.session.completed"); 
                      setCreditsPack(30); 
                      setAmountCents(2800); 
                    }}
                  >
                    Pack 30
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => { 
                      setEventType("invoice.paid"); 
                      setCreditsPack(0); 
                      setAmountCents(1000); 
                    }}
                  >
                    Base plan
                  </Button>
                  <Button 
                    variant="secondary" 
                    onClick={() => { 
                      setEventType("charge.refunded"); 
                    }}
                  >
                    Refund
                  </Button>
                </div>
                <Separator />
                <div className="grid gap-2">
                  <Label>Payload</Label>
                  <Textarea rows={14} value={payloadPreview} readOnly />
                </div>
                <Button onClick={() => sendMockEvent(email)} disabled={sendingMock}>
                  {sendingMock ? "Enviando..." : "Emitir evento al webhook"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <WebhookMonitor />
        </TabsContent>

        <TabsContent value="videos" className="space-y-6">
          <VideoRequestsAdmin />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Logs</CardTitle>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="200">200 (OK)</SelectItem>
                      <SelectItem value="400">400 (Bad Request)</SelectItem>
                      <SelectItem value="500">500 (Error)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => loadWebhookLogs(statusFilter)} disabled={loadingData}>
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Dirección</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={log.direction === "incoming" ? "default" : "secondary"}>
                            {log.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.event_type || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={log.status >= 200 && log.status < 300 ? "default" : "destructive"}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.provider || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pagos</CardTitle>
                <Button onClick={loadPayments} disabled={loadingData}>
                  Actualizar
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Monto</TableHead>
                      <TableHead>Créditos</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.created_at).toLocaleString()}</TableCell>
                        <TableCell>{(payment.profiles as any)?.email || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.payment_kind}</Badge>
                        </TableCell>
                        <TableCell>
                          {payment.currency.toUpperCase()} {(payment.amount_cents / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>{payment.credits_granted}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "succeeded" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Intakes</CardTitle>
                <div className="flex gap-2">
                  <Input
                    placeholder="Buscar por email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="max-w-sm"
                  />
                  <Button onClick={() => loadUserIntakes(searchEmail)} disabled={loadingData}>
                    Buscar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Actualizado</TableHead>
                      <TableHead>Completado</TableHead>
                      <TableHead>Datos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userIntakes.map((intake) => (
                      <TableRow key={intake.user_id}>
                        <TableCell>{(intake.profiles as any)?.email || "N/A"}</TableCell>
                        <TableCell>{new Date(intake.updated_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={intake.payload?.completed ? "default" : "secondary"}>
                            {intake.payload?.completed ? "Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(intake.payload, null, 2));
                              toast({ title: "Copiado", description: "Datos del intake copiados al clipboard" });
                            }}
                          >
                            Copiar JSON
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Admin;