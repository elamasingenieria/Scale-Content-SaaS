import { z } from "zod";

// Enums/constantes
export const brandVoices = ["formal", "casual", "directo", "inspiracional"] as const;
export const primaryGoals = ["alcance", "ventas", "retención", "branding"] as const;
export const kpiOptions = ["vistas", "CTR", "leads", "registros", "descargas"] as const;
export const ctaTypes = ["signup", "download", "demo", "otros"] as const;
export const ratios = ["9:16", "1:1", "16:9"] as const;
export const channels = ["instagram", "youtube"] as const;
export const genders = ["masculino", "femenino", "neutro"] as const;

const urlRegex = /^(https?:\/\/)[\w.-]+(\.[\w\.-]+)+(\/[\w\-.,@?^=%&:/~+#]*)?$/i;
const hexRegex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const intakeSchema = z.object({
  business: z.object({
    name: z.string().min(2, "Nombre requerido"),
    website: z.string().url("URL válida").regex(urlRegex, "URL válida"),
    vertical: z.string().min(2, "Requerido"),
    geo: z.string().min(2, "Requerido"),
    brand_voice: z.enum(brandVoices),
    palette_hex: z
      .array(z.string().regex(hexRegex, "Hex inválido"))
      .min(1, "Al menos 1 color"),
    fonts: z.array(z.string()).optional().default([]),
  }),
  goals: z.object({
    primary: z.enum(primaryGoals),
    kpis: z.array(z.enum(kpiOptions)).min(1, "Selecciona al menos 1 KPI"),
    cta: z.object({
      type: z.enum(ctaTypes),
      text: z.string().min(2, "Requerido"),
    }),
  }),
  audience: z.object({
    who: z.string().min(2, "Requerido"),
    pain_points: z.array(z.string()).max(10).default([]),
    age_range: z.string().min(2, "Requerido"),
    lang: z.literal("es"),
  }),
  content: z.object({
    duration_sec: z.number().min(15).max(120),
    ratio: z.enum(ratios),
    channels: z.array(z.enum(channels)).min(1),
    style: z.string().min(2, "Requerido"),
    style_refs: z.array(z.string().url().regex(urlRegex)).optional().default([]),
    competitors: z.array(z.string().url().regex(urlRegex)).optional().default([]),
  }),
  assets: z.object({
    logo_path: z.string().optional(),
    palette_json: z.record(z.string()).optional(),
    broll_paths: z.array(z.string()).max(10).optional().default([]),
    extra_images: z.array(z.string()).optional().default([]),
    legal_ok: z.boolean().refine(Boolean, { message: "Requerido" }),
  }),
  gen_prefs: z
    .object({
      voice: z.string().optional(),
      gender: z.enum(genders).optional(),
      pace: z.string().optional(),
    })
    .optional()
    .default({}),
});

export type IntakeFormValues = z.infer<typeof intakeSchema>;

export const defaultIntakeValues: IntakeFormValues = {
  business: {
    name: "",
    website: "",
    vertical: "",
    geo: "",
    brand_voice: "directo",
    palette_hex: ["#0ea5e9"],
    fonts: [],
  },
  goals: {
    primary: "alcance",
    kpis: ["vistas"],
    cta: { type: "signup", text: "" },
  },
  audience: {
    who: "",
    pain_points: [],
    age_range: "",
    lang: "es",
  },
  content: {
    duration_sec: 60,
    ratio: "9:16",
    channels: ["instagram"],
    style: "educativo",
    style_refs: [],
    competitors: [],
  },
  assets: {
    logo_path: undefined,
    palette_json: undefined,
    broll_paths: [],
    extra_images: [],
    legal_ok: false,
  },
  gen_prefs: {
    voice: "es-AR",
    gender: "neutro",
    pace: "normal",
  },
};
