import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import {
  intakeSchema,
  defaultIntakeValues,
  brandVoices,
  primaryGoals,
  kpiOptions,
  ctaTypes,
  ratios,
  channels,
  type IntakeFormValues,
} from "@/lib/schemas/intake";

const LOCAL_KEY_PREFIX = "intakeDraft:";

export default function BrandingIntakeWizard() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [step, setStep] = useState(1); // 1..4

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
      try { form.reset(JSON.parse(raw)); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Autosave local
  useEffect(() => {
    if (!draftKey) return;
    const sub = form.watch((values) => {
      try { localStorage.setItem(draftKey, JSON.stringify(values)); } catch {}
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
      toast({ title: "Borrador guardado", description: "Se guardó en la nube." });
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e.message ?? "Intenta de nuevo", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadPrevFromDB = async () => {
    setLoadingPrev(true);
    try {
      const { data, error } = await supabase.from("user_intake").select("payload").maybeSingle();
      if (error) throw error;
      if (data?.payload) {
        form.reset(data.payload as IntakeFormValues);
        toast({ title: "Datos previos cargados" });
      } else {
        toast({ title: "Sin datos previos" });
      }
    } catch (e: any) {
      toast({ title: "Error al cargar", description: e.message ?? "Intenta de nuevo", variant: "destructive" });
    } finally {
      setLoadingPrev(false);
    }
  };

  // Upload helpers
  const uploadToBucket = async (bucket: "branding" | "brolls", file: File) => {
    if (!userId) throw new Error("No auth");
    const path = `${userId}/${bucket === "branding" ? "logo" : "brolls"}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return `${bucket}/${path}`;
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

  // Step helpers
  const totalSteps = 4;
  const progress = Math.round(((step - 1) / totalSteps) * 100);

  const fieldsByStep: Record<number, (keyof IntakeFormValues | string)[]> = {
    1: ["business.name", "business.website", "business.vertical", "business.geo", "business.brand_voice", "business.palette_hex"],
    2: ["goals.primary", "goals.kpis", "goals.cta.type", "goals.cta.text", "audience.who", "audience.age_range"],
    3: ["content.duration_sec", "content.ratio", "content.channels", "content.style"],
    4: ["assets.legal_ok"],
  };

  const nextStep = async () => {
    const fields = fieldsByStep[step];
    const ok = await form.trigger(fields as any, { shouldFocus: true });
    if (!ok) return;
    setStep((s) => Math.min(totalSteps, s + 1));
  };
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const Summary = () => (
    <pre className="text-sm bg-muted p-4 rounded-md overflow-x-auto animate-fade-in">
      {JSON.stringify(form.getValues(), null, 2)}
    </pre>
  );

  return (
    <div className="space-y-4 animate-enter">
      <SEO title="Formulario para personalización | UGC Flow" description="Completa preferencias y assets para personalizar tus videos." canonical="/branding#intake" />

      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Formulario para personalización</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLoadPrevFromDB} disabled={loadingPrev}>{loadingPrev ? "Cargando…" : "Usar datos previos"}</Button>
          <Button onClick={handleSaveDraftDB} disabled={saving}>{saving ? "Guardando…" : "Guardar borrador"}</Button>
        </div>
      </header>

      <Progress value={progress} />
      <div className="text-xs text-muted-foreground">Progreso: {progress}%</div>

      <Form {...form}>
        <form className="space-y-6">
          {step === 1 && (
            <section className="grid md:grid-cols-2 gap-4 animate-fade-in">
              {/* Negocio / Marca */}
              <FormField control={form.control} name="business.name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del negocio</FormLabel>
                  <FormControl><Input {...field} placeholder="Acme Inc." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="business.website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sitio web</FormLabel>
                  <FormControl><Input {...field} placeholder="https://ejemplo.com" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="business.vertical" render={({ field }) => (
                <FormItem>
                  <FormLabel>Industria/vertical</FormLabel>
                  <FormControl><Input {...field} placeholder="EdTech, Retail…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="business.geo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Región/Mercado</FormLabel>
                  <FormControl><Input {...field} placeholder="LATAM, ES…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="business.brand_voice" render={({ field }) => (
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
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="business.palette_hex" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Paleta de colores (hex)</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {field.value.map((val, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={val}
                          onChange={(e) => {
                            const next = [...field.value]; next[idx] = e.target.value; field.onChange(next);
                          }}
                          placeholder="#0ea5e9"
                          className="w-36"
                        />
                        <Button type="button" variant="ghost" onClick={() => field.onChange(field.value.filter((_, i) => i !== idx))}>Quitar</Button>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={() => field.onChange([...field.value, "#111827"]) }>
                      + Color
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
            </section>
          )}

          {step === 2 && (
            <section className="grid md:grid-cols-2 gap-4 animate-enter">
              {/* Objetivos / Audiencia */}
              <FormField control={form.control} name="goals.primary" render={({ field }) => (
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
              )} />
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
              <FormField control={form.control} name="goals.cta.type" render={({ field }) => (
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
              )} />
              <FormField control={form.control} name="goals.cta.text" render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto del CTA</FormLabel>
                  <FormControl><Input {...field} placeholder="Prueba gratis 7 días" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="audience.who" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Audiencia</FormLabel>
                  <FormControl><Textarea {...field} placeholder="Quién es tu audiencia" rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="audience.pain_points" render={({ field }) => (
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
              )} />
              <FormField control={form.control} name="audience.age_range" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rango de edad</FormLabel>
                  <FormControl><Input {...field} placeholder="20-40" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="text-sm text-muted-foreground">Idioma: es</div>
            </section>
          )}

          {step === 3 && (
            <section className="grid md:grid-cols-2 gap-4 animate-enter">
              {/* Contenido / Canales */}
              <FormField control={form.control} name="content.duration_sec" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duración objetivo (seg)</FormLabel>
                  <FormControl>
                    <Input type="number" value={field.value} onChange={(e) => field.onChange(Number(e.target.value))} min={15} max={120} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="content.ratio" render={({ field }) => (
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
              )} />
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
              <FormField control={form.control} name="content.style" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Estilo de contenido</FormLabel>
                  <FormControl><Input {...field} placeholder="educativo, testimonial UGC, comparativa…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4 animate-enter">
              {/* Assets & Confirmación */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel>Logo (≤ 10MB)</FormLabel>
                  <Input type="file" accept="image/*" onChange={onLogoChange} />
                </FormItem>
                <FormItem className="md:col-span-2">
                  <FormLabel>B-rolls (múltiples, ≤ 200MB c/u)</FormLabel>
                  <Input type="file" multiple accept="video/*" onChange={onBrollsChange} />
                </FormItem>
                <FormField control={form.control} name="assets.legal_ok" render={({ field }) => (
                  <FormItem className="md:col-span-2 flex items-center gap-2">
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    <FormLabel className="!m-0">Confirmo permisos de uso de los assets</FormLabel>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Resumen</h3>
                <Summary />
              </div>
            </section>
          )}

          <div className="flex justify-between">
            <Button type="button" variant="secondary" onClick={prevStep} disabled={step === 1} className="hover-scale">Atrás</Button>
            {step < totalSteps ? (
              <Button type="button" onClick={nextStep} className="hover-scale">Siguiente</Button>
            ) : (
              <Button type="button" onClick={handleSaveDraftDB} className="hover-scale">Guardar</Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
