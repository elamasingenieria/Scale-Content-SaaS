import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BrollsUploader = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const getVideoDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.remove();
      };
      video.preload = "metadata";
      video.src = url;
      video.onloadedmetadata = () => {
        const d = video.duration;
        cleanup();
        resolve(d);
      };
      video.onerror = () => {
        cleanup();
        reject(new Error("No se pudo leer la duración del video"));
      };
    });

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !userId) return;
    for (const f of files) {
      if (f.size > 200 * 1024 * 1024) {
        toast({ title: "B-roll demasiado grande", description: `${f.name} supera 200MB`, variant: "destructive" });
        return;
      }
      try {
        const dur = await getVideoDuration(f);
        if (dur > 15) {
          toast({ title: "B-roll demasiado largo", description: `${f.name} dura ${Math.round(dur)}s (máx. 15s)`, variant: "destructive" });
          return;
        }
      } catch {
        toast({ title: "Error", description: `No se pudo leer duración de ${f.name}` , variant: "destructive" });
        return;
      }
    }

    try {
      setUploading(true);
      let count = 0;
      for (const f of files) {
        const path = `${userId}/brolls/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("brolls").upload(path, f, { upsert: true, contentType: f.type });
        if (error) throw error;
        count++;
      }
      toast({ title: "B-rolls subidos", description: `${count} archivo(s)` });
    } catch (e: any) {
      toast({ title: "Error subiendo b-rolls", description: e.message ?? "Intenta de nuevo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Input type="file" multiple accept="video/*" onChange={onFiles} disabled={!userId || uploading} />
      <div className="text-xs text-muted-foreground">
        Requisitos: tamaño ≤ 200MB y duración ≤ 15s.
      </div>
      <div className="text-xs text-muted-foreground">
        Se guardan en tu bucket privado y luego se enviarán al software de edición.
      </div>
      <Button type="button" variant="outline" disabled className="hidden">Subir</Button>
    </div>
  );
};

export default BrollsUploader;
