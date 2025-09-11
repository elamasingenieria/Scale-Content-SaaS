import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, CreditCard, CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const BillingHistory = () => {
  // Mock data - en el futuro esto vendría de Stripe
  const paymentHistory = [
    {
      id: "1",
      date: "2024-01-15",
      amount: "$7.99",
      status: "completed",
      description: "Pack de 10 créditos",
      paymentMethod: "Visa •••• 4242"
    },
    {
      id: "2", 
      date: "2023-12-20",
      amount: "$14.99",
      status: "completed",
      description: "Suscripción Premium - Enero",
      paymentMethod: "Visa •••• 4242"
    },
    {
      id: "3",
      date: "2023-12-01",
      amount: "$7.99",
      status: "failed",
      description: "Pack de 10 créditos",
      paymentMethod: "Visa •••• 4242"
    },
    {
      id: "4",
      date: "2023-11-20",
      amount: "$14.99", 
      status: "completed",
      description: "Suscripción Premium - Diciembre",
      paymentMethod: "Visa •••• 4242"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="secondary" className="text-green-600 bg-green-50 border-green-200">Completado</Badge>;
      case "failed":
        return <Badge variant="destructive">Fallido</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200">Pendiente</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <SEO
        title="Historial de Pagos | UGC Flow"
        description="Consulta tu historial completo de pagos y transacciones."
        canonical="/billing/history"
      />
      
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/billing">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Billing
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Historial de Pagos</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transacciones Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay transacciones registradas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {getStatusIcon(payment.status)}
                      <div>
                        <p className="font-medium">{payment.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{new Date(payment.date).toLocaleDateString('es-ES')}</span>
                          <span>•</span>
                          <span>{payment.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{payment.amount}</span>
                      {getStatusBadge(payment.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Total gastado</p>
                <p className="text-2xl font-bold text-brand">$37.97</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Pagos exitosos</p>
                <p className="text-2xl font-bold text-green-600">3</p>
              </div>
              <div className="text-center p-4 border border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Pagos fallidos</p>
                <p className="text-2xl font-bold text-red-600">1</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default BillingHistory;