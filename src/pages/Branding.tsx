import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import BrandingIntakeWizard from "@/components/branding/BrandingIntakeWizard";
import BrollsUploader from "@/components/branding/BrollsUploader";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Branding = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { balance, loading: balanceLoading } = useCreditBalance();
  const { toast } = useToast();

  // Check if form is completed and handle deep-link
  useEffect(() => {
    const checkCompletion = async () => {
      const { data: intake } = await supabase
        .from("user_intake")
        .select("payload")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      
      if (intake && typeof intake.payload === 'object' && intake.payload !== null && (intake.payload as any).completed) {
        setIsCompleted(true);
      }
    };

    checkCompletion();

    // Handle deep-link #intake
    if (location.hash === "#intake") {
      setShowWizard(true);
      // Clear hash from URL
      navigate("/branding", { replace: true });
    }
  }, [location.hash, navigate]);

  const createVideoRequest = async () => {
    if (balance === null || balance < 1) {
      toast({
        title: "Créditos insuficientes",
        description: "Necesitas al menos 1 crédito para crear una solicitud de video.",
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate("/billing")}>
            Comprar créditos
          </Button>
        ),
      });
      return;
    }

    try {
      setCreatingRequest(true);
      const { data: requestId, error } = await supabase.rpc("rpc_create_video_request");
      if (error) throw error;

      toast({
        title: "Solicitud creada",
        description: "Tu video request ha sido creado exitosamente. 1 crédito consumido.",
      });

      navigate("/videos");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la solicitud",
        variant: "destructive",
      });
    } finally {
      setCreatingRequest(false);
    }
  };

  return (
    <>
      <SEO
        title="Branding & Personalización | UGC Flow"
        description="Sube assets y completa el formulario para personalización."
        canonical="/branding"
      />

      {!showWizard && !isCompleted && (
        <div className="rounded-xl border border-border p-6 animate-fade-in">
          <h1 className="text-xl font-semibold mb-2">Branding & Assets</h1>
          <p className="text-muted-foreground mb-4">
            Carga tus logos y b‑rolls, y luego completa el formulario para personalizar tus videos.
          </p>
          <Button size="lg" className="hover-scale" onClick={() => setShowWizard(true)}>
            Lanzar formulario
          </Button>
        </div>
      )}

      {!showWizard && isCompleted && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div>
                  <h1 className="text-xl font-semibold">Formulario completado</h1>
                  <p className="text-muted-foreground">Tu perfil de branding está configurado</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowWizard(true)}>
                  Editar formulario
                </Button>
                <Button 
                  onClick={createVideoRequest} 
                  disabled={creatingRequest || balanceLoading || balance === null || balance < 1}
                  className="hover-scale"
                >
                  {creatingRequest ? "Creando..." : "Crear solicitud de video"}
                </Button>
              </div>
              {!balanceLoading && balance !== null && balance < 1 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Créditos: {balance} (necesitas al menos 1 crédito)
                </p>
              )}
            </CardContent>
          </Card>

          <div className="rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold mb-2">Brolls</h2>
            <p className="text-muted-foreground mb-4">
              Sube videos de menos de 200MB y 15s de duración para usar en tus proyectos.
            </p>
            <BrollsUploader />
          </div>
        </div>
      )}

      {showWizard && <BrandingIntakeWizard />}
    </>
  );
};

export default Branding;
