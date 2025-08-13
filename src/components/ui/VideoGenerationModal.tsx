import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreditBalance } from "@/hooks/useCreditBalance";
import { getBrandingAssetsWithSignedUrls } from "@/lib/services/videoGenerationService";
import { getWebhookErrorMessage } from "@/lib/services/n8nWebhookService";

interface VideoGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoGenerationModal({ open, onOpenChange }: VideoGenerationModalProps) {
  const navigate = useNavigate();
  const [instructions, setInstructions] = useState("");
  const [videoCount, setVideoCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const { balance, loading: balanceLoading, refresh: refreshBalance } = useCreditBalance();

  const videoCountNumber = parseInt(videoCount);
  const hasEnoughCredits = balance !== null && balance >= videoCountNumber;
  const creditsNeeded = videoCountNumber;

  // Loading steps configuration
  const loadingSteps = [
    { message: "Validando formularios...", duration: 1000 },
    { message: "Obteniendo assets de marca...", duration: 1500 },
    { message: "Validando créditos...", duration: 800 },
    { message: "Creando solicitudes de video...", duration: 2000 },
    { message: "Enviando a n8n para procesamiento...", duration: 2500 },
    { message: "Finalizando...", duration: 500 }
  ];

  const updateLoadingProgress = async (stepIndex: number, message: string, duration: number) => {
    setLoadingMessage(message);
    setProgress(((stepIndex + 1) / loadingSteps.length) * 100);
    await new Promise(resolve => setTimeout(resolve, duration));
  };

  const handleSubmit = async () => {
    if (!hasEnoughCredits) {
      toast({
        title: "Créditos insuficientes",
        description: `Tienes ${balance} créditos, necesitas ${creditsNeeded}.`,
        variant: "destructive",
        action: (
          <Button 
            size="sm" 
            onClick={() => {
              onOpenChange(false);
              navigate('/billing');
            }}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Comprar créditos
          </Button>
        ),
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    let stepIndex = 0;

    try {
      // Step 1: Validate forms
      await updateLoadingProgress(stepIndex++, loadingSteps[0].message, loadingSteps[0].duration);
      
      // Get current user ID
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        throw new Error("Usuario no autenticado");
      }

      // Step 2: Get branding assets
      await updateLoadingProgress(stepIndex++, loadingSteps[1].message, loadingSteps[1].duration);
      
      const brandingAssets = await getBrandingAssetsWithSignedUrls(userId);

      // Validate branding assets
      if (brandingAssets.length === 0) {
        throw new Error('No se encontraron assets de marca. Sube al menos un logo o imagen de marca.');
      }

      // Fetch UGC form data from database
      const { data: ugcData, error: ugcError } = await supabase
        .from('ugc_script_forms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ugcError) {
        throw new Error('Error al obtener datos del formulario UGC');
      }

      if (!ugcData) {
        throw new Error('No se encontraron datos del formulario UGC. Completa el formulario primero.');
      }

      // Step 3: Validate credits
      await updateLoadingProgress(stepIndex++, loadingSteps[2].message, loadingSteps[2].duration);
      
      // Refresh balance to ensure it's current
      await refreshBalance();

      // Step 4: Create video requests
      await updateLoadingProgress(stepIndex++, loadingSteps[3].message, loadingSteps[3].duration);
      
      const idempotencyKey = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('create_video_request', {
        body: {
          userId: userId,
          modalData: {
            videoCount: videoCountNumber,
            customInstructions: instructions.trim(),
          },
          ugcData: ugcData,
          brandingAssets: brandingAssets,
        },
        headers: {
          'Idempotency-Key': idempotencyKey,
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        const friendlyMessage = getWebhookErrorMessage(error);
        throw new Error(friendlyMessage || error.message || 'Error al procesar la solicitud');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Error al crear las solicitudes de video');
      }

      // Step 5: Finalizing
      await updateLoadingProgress(stepIndex++, loadingSteps[4].message, loadingSteps[4].duration);
      await updateLoadingProgress(stepIndex++, loadingSteps[5].message, loadingSteps[5].duration);

      // Success - refresh balance and show success
      await refreshBalance();
      
      // Success toast with navigation
      toast({
        title: "¡Videos enviados correctamente!",
        description: `${videoCountNumber} video(s) están siendo procesados. ID de lote: ${data.batch_id?.slice(-8) || 'N/A'}`,
        action: (
          <Button 
            size="sm" 
            onClick={() => {
              onOpenChange(false);
              navigate('/videos');
            }}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Ver videos
          </Button>
        ),
      });

      // Close modal and reset form
      onOpenChange(false);
      setInstructions("");
      setVideoCount("1");

    } catch (error: any) {
      console.error('Error in video generation flow:', error);
      
      // Enhanced error handling with specific cases
      let errorMessage = "Error al procesar la solicitud. Sus créditos no fueron deducidos.";
      let errorTitle = "Error al generar videos";
      let showNavigateAction = false;
      let actionText = "";
      let navigateTo = "";
      
      if (error.message?.includes("Saldo insuficiente")) {
        errorMessage = error.message;
        errorTitle = "Créditos insuficientes";
        showNavigateAction = true;
        actionText = "Comprar créditos";
        navigateTo = "/billing";
      } else if (error.message?.includes("formulario UGC")) {
        errorMessage = error.message;
        errorTitle = "Formulario incompleto";
        showNavigateAction = true;
        actionText = "Completar formulario";
        navigateTo = "/formularios";
      } else if (error.message?.includes("assets de marca")) {
        errorMessage = error.message;
        errorTitle = "Assets de marca faltantes";
        showNavigateAction = true;
        actionText = "Subir assets";
        navigateTo = "/branding";
      } else if (error.message?.includes("duplicada")) {
        errorMessage = "Solicitud duplicada detectada. Si el problema persiste, contacta soporte.";
        errorTitle = "Solicitud duplicada";
      } else if (error.message?.includes("HTTP")) {
        errorMessage = "Error de conexión con el servidor. Verifica tu conexión e intenta nuevamente.";
        errorTitle = "Error de conexión";
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        action: showNavigateAction ? (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              navigate(navigateTo);
            }}
          >
            {actionText}
          </Button>
        ) : undefined,
      });
    } finally {
      setIsGenerating(false);
      setProgress(0);
      setLoadingMessage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] animate-slide-in-right">
        <DialogHeader>
          <DialogTitle>Generar Videos UGC</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Loading Progress Section */}
          {isGenerating && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Procesando solicitud...</p>
                  <p className="text-xs text-muted-foreground">{loadingMessage}</p>
                </div>
                <span className="text-xs font-mono bg-background px-2 py-1 rounded">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-muted-foreground text-center">
                No cierres esta ventana hasta que el proceso termine
              </p>
            </div>
          )}

          {/* Hide form sections when generating */}
          {!isGenerating && (
            <>
              {/* Section 1: Instructions */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Instrucciones específicas (opcional)</Label>
                <Textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Instrucciones adicionales para estos videos específicos..."
                  rows={3}
                  maxLength={1000}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {instructions.length}/1000 caracteres
                </p>
              </div>

              <Separator />

              {/* Section 2: Video Count */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">¿Cuántos videos generar? *</Label>
                <RadioGroup value={videoCount} onValueChange={setVideoCount}>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((count) => (
                      <div key={count} className="flex flex-col items-center space-y-1">
                        <RadioGroupItem
                          value={count.toString()}
                          id={`count-${count}`}
                          className="data-[state=checked]:border-primary"
                        />
                        <Label
                          htmlFor={`count-${count}`}
                          className="text-sm cursor-pointer"
                        >
                          {count}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {/* Credit Info */}
                <div className="p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center justify-between text-sm">
                    <span>Se descontarán:</span>
                    <span className="font-medium">{creditsNeeded} créditos</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>Saldo actual:</span>
                    <span>
                      {balanceLoading ? "Cargando..." : `${balance || 0} créditos`}
                    </span>
                  </div>
                </div>

                {/* Insufficient Credits Warning */}
                {!balanceLoading && !hasEnoughCredits && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm text-destructive">
                      Créditos insuficientes. Tienes {balance}, necesitas {creditsNeeded}.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Section 3: Action Buttons */}
              <div className="flex justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isGenerating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isGenerating || balanceLoading || !hasEnoughCredits}
                >
                  {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar videos
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}