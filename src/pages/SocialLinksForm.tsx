import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { socialLinksFormSchema, SocialLinksFormData, socialLinksFormDefaults } from "@/lib/schemas/socialLinksForm";
import SEO from "@/components/SEO";

const LOCAL_STORAGE_KEY = "social-links-form-draft";

export default function SocialLinksForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<SocialLinksFormData>({
    resolver: zodResolver(socialLinksFormSchema),
    defaultValues: socialLinksFormDefaults,
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getUser();

    // Load draft from localStorage
    const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedDraft) {
      try {
        const parsedDraft = JSON.parse(savedDraft);
        form.reset(parsedDraft);
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }

    // Load existing data from database
    loadExistingData();
  }, [form]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const formData = form.getValues();
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(formData));
    }, 30000);

    return () => clearInterval(interval);
  }, [form]);

  const loadExistingData = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_social_links")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        form.reset({
          instagram_url: data.instagram_url || "",
          tiktok_url: data.tiktok_url || "",
          youtube_url: data.youtube_url || "",
        });
      }
    } catch (error) {
      console.error("Error loading existing data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información existente",
        variant: "destructive",
      });
    }
  };

  const saveDraft = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const formData = form.getValues();

      const { error } = await supabase.rpc("rpc_upsert_user_social_links", {
        p_instagram_url: formData.instagram_url || null,
        p_tiktok_url: formData.tiktok_url || null,
        p_youtube_url: formData.youtube_url || null,
      });

      if (error) throw error;

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({
        title: "Borrador guardado",
        description: "Tus enlaces de redes sociales han sido guardados",
      });
    } catch (error) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el borrador",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SocialLinksFormData) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc("rpc_upsert_user_social_links", {
        p_instagram_url: data.instagram_url || null,
        p_tiktok_url: data.tiktok_url || null,
        p_youtube_url: data.youtube_url || null,
      });

      if (error) throw error;

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({
        title: "Enlaces guardados",
        description: "Tus enlaces de redes sociales han sido guardados correctamente",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Enlaces de Redes Sociales"
        description="Conecta tus perfiles de redes sociales para análisis de métricas y seguimiento"
      />
      
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Enlaces de Redes Sociales</CardTitle>
            <CardDescription>
              Conecta tus perfiles de redes sociales. En el futuro haremos integraciones directas con el auth de las redes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <FormField
                  control={form.control}
                  name="instagram_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enlace a tu perfil de Instagram"
                          type="url"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiktok_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enlace a tu perfil de TikTok"
                          type="url"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="youtube_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>YouTube</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enlace a tu canal de YouTube"
                          type="url"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={saveDraft}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar borrador
                  </Button>
                  
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar y finalizar
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}