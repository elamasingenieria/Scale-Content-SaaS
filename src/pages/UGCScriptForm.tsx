import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ugcScriptFormSchema, UGCScriptFormData, ugcScriptFormDefaults } from "@/lib/schemas/ugcScriptForm";
import SEO from "@/components/SEO";

// UGC Script Form - Cache refresh
const LOCAL_STORAGE_KEY = "ugc-script-form-draft";

export default function UGCScriptForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const form = useForm<UGCScriptFormData>({
    resolver: zodResolver(ugcScriptFormSchema),
    defaultValues: ugcScriptFormDefaults,
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
        .from("ugc_script_forms")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        const formattedData = {
          ...data,
          recording_formats: data.recording_formats || [],
          delivery_deadline: data.delivery_deadline 
            ? format(new Date(data.delivery_deadline), "yyyy-MM-dd")
            : "",
        };
        form.reset(formattedData);
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
      const payload = {
        ...formData,
        recording_formats: formData.recording_formats || [],
      };

      const { error } = await supabase.rpc("rpc_upsert_ugc_script_form", {
        p_payload: payload,
      });

      if (error) throw error;

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({
        title: "Borrador guardado",
        description: "Tu información ha sido guardada correctamente",
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

  const onSubmit = async (data: UGCScriptFormData) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const payload = {
        ...data,
        recording_formats: data.recording_formats || [],
      };

      const { error } = await supabase.rpc("rpc_upsert_ugc_script_form", {
        p_payload: payload,
      });

      if (error) throw error;

      localStorage.removeItem(LOCAL_STORAGE_KEY);
      toast({
        title: "Formulario completado",
        description: "Tu información ha sido guardada y enviada correctamente",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar el formulario",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recordingFormatOptions = [
    "Vertical (Reels/TikTok)",
    "Cuadrado (Instagram Feed)",
    "Horizontal (YouTube u otros)",
  ];

  return (
    <>
      <SEO 
        title="Formulario de Producción de Guiones UGC"
        description="Completa este formulario para asegurar que los videos UGC sean exactamente lo que necesitas para tu campaña"
      />
      
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Formulario de Producción de Guiones UGC</CardTitle>
            <CardDescription className="text-base">
              ¡Hola! Para asegurarnos de que los videos UGC que creamos para tu campaña sean exactamente lo que necesitas, 
              te pedimos que completes este formulario. Esto nos ayudará a minimizar las correcciones y asegurará una 
              entrega rápida y eficiente. ¡Gracias por tu cooperación!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Datos del cliente */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">1. Datos del cliente</h3>
                  
                  <FormField
                    control={form.control}
                    name="client_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del cliente *</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creators_and_videos_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cantidad de creadores y de videos *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Especificar género, países, etc."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Especificaciones del video */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">2. Especificaciones del video</h3>
                  
                  <FormField
                    control={form.control}
                    name="video_duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duración aproximada</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="15-30-segundos" id="duration1" />
                              <label htmlFor="duration1">15 a 30 segundos</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="30-60-segundos" id="duration2" />
                              <label htmlFor="duration2">30 a 60 segundos</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="hasta-90-segundos" id="duration3" />
                              <label htmlFor="duration3">Hasta 90 segundos</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="otra" id="duration4" />
                              <label htmlFor="duration4">Otra</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("video_duration") === "otra" && (
                    <FormField
                      control={form.control}
                      name="video_duration_other"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Especificar duración</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Solo para producto */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">3. Solo para producto</h3>
                  
                  <FormField
                    control={form.control}
                    name="product_display_timing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Cuándo debe mostrarse el producto?</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="ingenio-creador" id="timing1" />
                              <label htmlFor="timing1">Ingenio del creador</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="desde-comienzo" id="timing2" />
                              <label htmlFor="timing2">Desde el comienzo del video</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="solo-cuando-menciona" id="timing3" />
                              <label htmlFor="timing3">Solo cuando se menciona</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="al-final" id="timing4" />
                              <label htmlFor="timing4">Al final del video</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="todo-video" id="timing5" />
                              <label htmlFor="timing5">Todo el video</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recording_formats"
                    render={() => (
                      <FormItem>
                        <FormLabel>Formato de grabación</FormLabel>
                        <div className="space-y-3">
                          {recordingFormatOptions.map((format) => (
                            <FormField
                              key={format}
                              control={form.control}
                              name="recording_formats"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={format}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(format)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), format])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== format
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {format}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recording_formats_other"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Otro formato</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="existing_script_links"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Links a guiones existentes</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="delivery_deadline"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha límite de entrega</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(new Date(field.value), "PPP", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Instrucciones para guion y producción */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">4. Instrucciones para guion y producción</h3>
                  
                  <FormField
                    control={form.control}
                    name="app_parts_to_show"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Qué partes de la app, SaaS, servicio o producto debemos mostrar y cuáles no?</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recording_locations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Hay lugares, planos o fondos específicos para grabar?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="ej: cocina, baño, sala de estar, exteriores, fondo blanco, etc."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creator_clothing"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vestimenta del creador</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="ropa-basica-colores-marca" id="clothing1" />
                              <label htmlFor="clothing1">Ropa básica sin logos con colores de la marca</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="ropa-formal" id="clothing2" />
                              <label htmlFor="clothing2">Ropa formal</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="casual" id="clothing3" />
                              <label htmlFor="clothing3">Casual</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="a-eleccion-creador" id="clothing4" />
                              <label htmlFor="clothing4">A elección del creador</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="otra" id="clothing5" />
                              <label htmlFor="clothing5">Otra</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("creator_clothing") === "otra" && (
                    <FormField
                      control={form.control}
                      name="creator_clothing_other"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Especificar vestimenta</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="creator_appearance_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estilo de aparición del creador</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="sentado-plano-fijo" id="appearance1" />
                              <label htmlFor="appearance1">Sentado/a en plano fijo</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="parado-hablando-camara" id="appearance2" />
                              <label htmlFor="appearance2">Parado/a hablando a cámara</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="combinando-planos" id="appearance3" />
                              <label htmlFor="appearance3">Combinando planos (detalle producto, rostro, cuerpo entero)</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="en-movimiento" id="appearance4" />
                              <label htmlFor="appearance4">En movimiento (acciones, caminando, etc.)</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="otra" id="appearance5" />
                              <label htmlFor="appearance5">Otra</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("creator_appearance_style") === "otra" && (
                    <FormField
                      control={form.control}
                      name="creator_appearance_style_other"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Especificar estilo de aparición</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="creator_activity_while_talking"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Prefieres que el creador esté haciendo algo mientras habla o solo hablando?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="ej: usando un cubo Rubik, spinner, etc."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Solo para apps */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">5. Solo para apps</h3>
                  
                  <FormField
                    control={form.control}
                    name="app_display_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Cómo mostrar la app?</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fondo-verde-editada" id="app1" />
                              <label htmlFor="app1">Fondo verde con la app editada</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="desde-celular" id="app2" />
                              <label htmlFor="app2">Mostrando la app desde un celular</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="desde-pc" id="app3" />
                              <label htmlFor="app3">Mostrando la app desde una PC</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Estilo y guion */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">6. Estilo y guion</h3>
                  
                  <FormField
                    control={form.control}
                    name="script_adherence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Los creadores deben seguir el guion tal cual o ponerle su impronta?</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="seguir-tal-cual" id="script1" />
                              <label htmlFor="script1">Seguir el guion tal cual</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="ponerle-impronta" id="script2" />
                              <label htmlFor="script2">Ponerle su impronta</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="creator_speech_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Cómo deben hablar los creadores?</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value}>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="acento-natural" id="speech1" />
                              <label htmlFor="speech1">Con su acento natural</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="acento-neutro" id="speech2" />
                              <label htmlFor="speech2">Acento neutro</label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brand_pronunciation_guide"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Cómo se pronuncia el nombre de la empresa, logos, imagen de marca?</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="link de descarga si es necesario para edición"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Objetivos y estrategia */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">7. Objetivos y estrategia</h3>
                  
                  <FormField
                    control={form.control}
                    name="main_objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objetivo principal de los videos</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ej: aumentar ventas, branding, atraer seguidores"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="key_message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensaje clave a transmitir</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="brand_values"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valores de la marca a reflejar</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="target_audience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Público objetivo</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="edad, género, intereses"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="product_or_service"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Producto o servicio a promocionar</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="key_features_benefits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Características o beneficios clave a destacar</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="technical_details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detalles técnicos o información específica para incluir en guiones</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="video_tone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tono de los videos</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ej: humorístico, inspirador, informativo"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reference_ugc_videos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ejemplos de videos UGC de referencia</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="link"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="call_to_action"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Call To Action (CTA)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="ej: visitar web, descargar app, seguir en redes, comprar producto"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="competitive_differentiators"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diferenciales frente a la competencia y cómo destacarlos</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Otros */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">8. Otros</h3>
                  
                  <FormField
                    control={form.control}
                    name="additional_details"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>¿Algún otro detalle que debamos saber antes de grabar?</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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