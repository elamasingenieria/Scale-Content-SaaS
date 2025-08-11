import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  intakeSchema,
  defaultIntakeValues,
  brandVoices,
  primaryGoals,
  kpiOptions,
  ctaTypes,
  ratios,
  channels,
  genders,
  type IntakeFormValues,
} from "@/lib/schemas/intake";

const LOCAL_KEY_PREFIX = "intakeDraft:";

const Intake = () => {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("1");

  const form = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    mode: "onChange",
    defaultValues: defaultIntakeValues,
  });

  const draftKey = useMemo(() => (userId ? `${LOCAL_KEY_PREFIX}${userId}` : null), [userId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Load local draft on mount
  useEffect(() => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        form.reset(parsed);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Autosave to localStorage
  useEffect(() => {
    if (!draftKey) return;
    const sub = form.watch((values) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(values));
      } catch {}
    });
    return () => sub.unsubscribe();
  }, [form, draftKey]);

  const handleSaveDraftDB = async () => {
    if (!userId) return;
    try {
      setSaving(true);
      const values = form.getValues();
      const { error } = await supabase.rpc("rpc_upsert_user_intake", { p_payload: values });
      if (error) throw error;
      toast({ title: "Borrador guardado", description: "Tu intake fue guardado en la nube." });
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e.message ?? "Intenta de nuevo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadPrevFromDB = async () => {
    setLoadingPrev(true);
    try {
      const { data, error } = await supabase
        .from("user_intake")
        .select("payload")
        .maybeSingle();
      if (error) throw error;
      if (data?.payload) {
        form.reset(data.payload as IntakeFormValues);
        toast({ title: "Datos cargados", description: "Usando tu último intake guardado." });
      } else {
        toast({ title: "Sin datos previos", description: "No encontramos un intake guardado." });
      }
    } catch (e: any) {
      toast({ title: "Error al cargar", description: e.message ?? "Intenta de nuevo", variant: "destructive" });
    } finally {
      setLoadingPrev(false);
    }
  };

  const handleUseLocalDraft = () => {
    if (!draftKey) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        form.reset(parsed);
        toast({ title: "Borrador local cargado" });
      } catch {}
    }
  };

  // Upload helpers
  const uploadToBucket = async (bucket: "branding" | "brolls", file: File) => {
    if (!userId) throw new Error("No auth");
    const path = `${userId}/${bucket === "branding" ? "logo" : "brolls"}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return `${bucket}/${path}`; // full storage path
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Logo demasiado grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }
    try {
      const storagePath = await uploadToBucket("branding", file);
      form.setValue("assets.logo_path", storagePath, { shouldValidate: true });
      toast({ title: "Logo subido" });
    } catch (e: any) {
      toast({ title: "Error subiendo logo", description: e.message, variant: "destructive" });
    }
  };

  const onBrollsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      if (file.size > 200 * 1024 * 1024) {
        toast({ title: "B-roll demasiado grande", description: `${file.name} supera 200MB`, variant: "destructive" });
        return;
      }
    }
    try {
      const paths: string[] = [];
      for (const file of files) {
        const storagePath = await uploadToBucket("brolls", file);
        paths.push(storagePath);
      }
      const prev = form.getValues("assets.broll_paths") ?? [];
      form.setValue("assets.broll_paths", [...prev, ...paths], { shouldValidate: true });
      toast({ title: "B-rolls subidos", description: `${paths.length} archivo(s)` });
    } catch (e: any) {
      toast({ title: "Error subiendo b-rolls", description: e.message, variant: "destructive" });
    }
  };

  const Summary = () => {
    const values = form.getValues();
    return (
      <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto">
        {JSON.stringify(values, null, 2)}
      </pre>
    );
  };

  return (
    <>
      <SEO
        title="Intake de marca y video | UGC Flow"
        description="Define negocio, objetivos, audiencia, contenido y assets para generar tus videos UGC."
        canonical="/intake"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: "Formulario de Intake",
          description: "Recolecta preferencias y assets para generación de video UGC",
        }}
      />

      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Formulario de Intake</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleUseLocalDraft} disabled={!userId}>
            Usar borrador local
          </Button>
          <Button variant="outline" onClick={handleLoadPrevFromDB} disabled={loadingPrev}>
            {loadingPrev ? "Cargando…" : "Usar mis datos previos"}
          </Button>
          <Button onClick={handleSaveDraftDB} disabled={saving}>
            {saving ? "Guardando…" : "Guardar como borrador"}
          </Button>
        </div>
      </header>

      <Form {...form}>
        <form className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="1">Negocio/Marca</TabsTrigger>
              <TabsTrigger value="2">Objetivos/Audiencia</TabsTrigger>
              <TabsTrigger value="3">Contenido/Canales</TabsTrigger>
              <TabsTrigger value="4">Assets & Confirmación</TabsTrigger>
            </TabsList>

            <TabsContent value="1" className="space-y-6">
              <section className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="business.name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del negocio</FormLabel>
                      <FormControl><Input {...field} placeholder="Acme Inc." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business.website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sitio web</FormLabel>
                      <FormControl><Input {...field} placeholder="https://ejemplo.com" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business.vertical"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industria/vertical</FormLabel>
                      <FormControl><Input {...field} placeholder="EdTech, Retail…" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business.geo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Región/Mercado</FormLabel>
                      <FormControl><Input {...field} placeholder="LATAM, ES…" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business.brand_voice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tono de marca</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brandVoices.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormDescription>formal, casual, directo, inspiracional.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business.palette_hex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paleta de colores (hex)</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {field.value.map((val, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input
                              value={val}
                              onChange={(e) => {
                                const next = [...field.value];
                                next[idx] = e.target.value;
                                field.onChange(next);
                              }}
                              placeholder="#0ea5e9"
                              className="w-36"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => field.onChange(field.value.filter((_, i) => i !== idx))}
                            >
                              Quitar
                            </Button>
                          </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => field.onChange([...field.value, "#111827"]) }>
                          + Color
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="business.fonts"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Tipografías (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Inter, Roboto…"
                          value={field.value?.join(", ") ?? ""}
                          onChange={(e) => field.onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
              <div className="flex justify-end">
                <Button type="button" onClick={() => setActiveTab("2")}>Siguiente</Button>
              </div>
            </TabsContent>

            <TabsContent value="2" className="space-y-6">
              <section className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="goals.primary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivo primario</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {primaryGoals.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>KPIs</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {kpiOptions.map((kpi) => {
                      const checked = form.watch("goals.kpis").includes(kpi);
                      return (
                        <Label key={kpi} className="flex items-center gap-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const curr = form.getValues("goals.kpis");
                              const next = v ? [...new Set([...curr, kpi])] : curr.filter((x) => x !== kpi);
                              form.setValue("goals.kpis", next, { shouldValidate: true });
                            }}
                          />
                          {kpi}
                        </Label>
                      );
                    })}
                  </div>
                </FormItem>
                <FormField
                  control={form.control}
                  name="goals.cta.type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ctaTypes.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goals.cta.text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto del CTA</FormLabel>
                      <FormControl><Input {...field} placeholder="Prueba gratis 7 días" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="audience.who"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Audiencia</FormLabel>
                      <FormControl><Textarea {...field} placeholder="Quién es tu audiencia" rows={3} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="audience.pain_points"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Pains principales (uno por línea)</FormLabel>
                      <FormControl>
                        <Textarea
                          value={(field.value ?? []).join("\n")}
                          onChange={(e) => field.onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="audience.age_range"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rango de edad</FormLabel>
                      <FormControl><Input {...field} placeholder="20-40" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Idioma</FormLabel>
                  <div className="text-sm">es</div>
                </FormItem>
              </section>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveTab("1")}>Atrás</Button>
                <Button type="button" onClick={() => setActiveTab("3")}>Siguiente</Button>
              </div>
            </TabsContent>

            <TabsContent value="3" className="space-y-6">
              <section className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="content.duration_sec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración objetivo (seg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          min={15}
                          max={120}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content.ratio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formato</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ratios.map((v) => (<SelectItem key={v} value={v}>{v}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem className="md:col-span-2">
                  <FormLabel>Canales</FormLabel>
                  <div className="flex gap-4">
                    {channels.map((ch) => {
                      const selected = form.watch("content.channels").includes(ch);
                      return (
                        <Label key={ch} className="flex items-center gap-2">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(v) => {
                              const curr = form.getValues("content.channels");
                              const next = v ? [...new Set([...curr, ch])] : curr.filter((x) => x !== ch);
                              form.setValue("content.channels", next, { shouldValidate: true });
                            }}
                          />
                          {ch}
                        </Label>
                      );
                    })}
                  </div>
                </FormItem>
                <FormField
                  control={form.control}
                  name="content.style"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Estilo de contenido</FormLabel>
                      <FormControl><Input {...field} placeholder="educativo, testimonial UGC, comparativa…" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content.style_refs"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Referencias (URLs, una por línea)</FormLabel>
                      <FormControl>
                        <Textarea
                          value={(field.value ?? []).join("\n")}
                          onChange={(e) => field.onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content.competitors"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Competidores (URLs, una por línea)</FormLabel>
                      <FormControl>
                        <Textarea
                          value={(field.value ?? []).join("\n")}
                          onChange={(e) => field.onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveTab("2")}>Atrás</Button>
                <Button type="button" onClick={() => setActiveTab("4")}>Siguiente</Button>
              </div>
            </TabsContent>

            <TabsContent value="4" className="space-y-6">
              <section className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel>Logo (≤ 10MB)</FormLabel>
                    <Input type="file" accept="image/*" onChange={onLogoChange} />
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="assets.palette_json"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Paleta (JSON opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder='{"primary":"#0ea5e9","secondary":"#111827"}'
                            value={field.value ? JSON.stringify(field.value) : ""}
                            onChange={(e) => {
                              try {
                                const val = e.target.value.trim();
                                field.onChange(val ? JSON.parse(val) : undefined);
                              } catch {
                                // ignore parse errors until submit
                              }
                            }}
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>Opcional: claves y hex.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem className="md:col-span-2">
                    <FormLabel>B-rolls (múltiples, ≤ 200MB c/u)</FormLabel>
                    <Input type="file" multiple accept="video/*" onChange={onBrollsChange} />
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="assets.legal_ok"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2 flex items-center gap-2">
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        <FormLabel className="!m-0">Confirmo permisos de uso de los assets</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <h2 className="text-sm font-medium mb-2">Resumen</h2>
                  <Summary />
                </div>
              </section>
              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setActiveTab("3")}>Atrás</Button>
                <Button type="button" onClick={handleSaveDraftDB} disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </>
  );
};

export default Intake;
