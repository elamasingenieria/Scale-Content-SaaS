import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCreditBalance } from "@/hooks/useCreditBalance";

interface VideoGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VideoGenerationModal({ open, onOpenChange }: VideoGenerationModalProps) {
  const [instructions, setInstructions] = useState("");
  const [videoCount, setVideoCount] = useState("1");
  const [isGenerating, setIsGenerating] = useState(false);
  const { balance, loading: balanceLoading } = useCreditBalance();

  const videoCountNumber = parseInt(videoCount);
  const hasEnoughCredits = balance !== null && balance >= videoCountNumber;
  const creditsNeeded = videoCountNumber;

  const handleSubmit = async () => {
    if (!hasEnoughCredits) {
      toast({
        title: "Créditos insuficientes",
        description: `Tienes ${balance} créditos, necesitas ${creditsNeeded}.`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Create multiple video requests based on selected count
      const promises = Array.from({ length: videoCountNumber }, async () => {
        const { data, error } = await supabase.rpc('rpc_create_video_request');
        if (error) throw error;
        return data;
      });

      const results = await Promise.all(promises);
      
      toast({
        title: "Videos solicitados",
        description: `Se han creado ${videoCountNumber} solicitudes de video exitosamente.`,
      });

      onOpenChange(false);
      setInstructions("");
      setVideoCount("1");
    } catch (error: any) {
      toast({
        title: "Error al crear solicitudes",
        description: error.message || "No se pudieron crear las solicitudes de video",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] animate-slide-in-right">
        <DialogHeader>
          <DialogTitle>Generar Videos UGC</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}