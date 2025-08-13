import { z } from "zod";

export const ugcScriptFormSchema = z.object({
  // Datos del cliente
  client_name: z.string().min(1, "El nombre del cliente es requerido"),
  creators_and_videos_count: z.string().min(1, "Especificar cantidad de creadores y videos es requerido"),

  // Especificaciones del video
  video_duration: z.string().min(1, "La duración del video es requerida"),
  video_duration_other: z.string().optional(),

  // Solo para producto
  product_display_timing: z.string().optional(),
  recording_formats: z.array(z.string()).optional(),
  recording_formats_other: z.string().optional(),
  existing_script_links: z.string().optional(),
  delivery_deadline: z.string().optional(),

  // Instrucciones para guion y producción
  app_parts_to_show: z.string().optional(),
  recording_locations: z.string().optional(),
  creator_clothing: z.string().optional(),
  creator_clothing_other: z.string().optional(),
  creator_appearance_style: z.string().optional(),
  creator_appearance_style_other: z.string().optional(),
  creator_activity_while_talking: z.string().optional(),

  // Solo para apps
  app_display_method: z.string().optional(),

  // Estilo y guion
  script_adherence: z.string().optional(),
  creator_speech_style: z.string().optional(),
  brand_pronunciation_guide: z.string().optional(),

  // Objetivos y estrategia
  main_objective: z.string().optional(),
  key_message: z.string().optional(),
  brand_values: z.string().optional(),
  target_audience: z.string().optional(),
  product_or_service: z.string().optional(),
  key_features_benefits: z.string().optional(),
  technical_details: z.string().optional(),
  video_tone: z.string().optional(),
  reference_ugc_videos: z.string().optional(),
  call_to_action: z.string().optional(),
  competitive_differentiators: z.string().optional(),

  // Otros
  additional_details: z.string().optional(),
});

export type UGCScriptFormData = z.infer<typeof ugcScriptFormSchema>;

export const ugcScriptFormDefaults: UGCScriptFormData = {
  client_name: "",
  creators_and_videos_count: "",
  video_duration: "",
  video_duration_other: "",
  product_display_timing: "",
  recording_formats: [],
  recording_formats_other: "",
  existing_script_links: "",
  delivery_deadline: "",
  app_parts_to_show: "",
  recording_locations: "",
  creator_clothing: "",
  creator_clothing_other: "",
  creator_appearance_style: "",
  creator_appearance_style_other: "",
  creator_activity_while_talking: "",
  app_display_method: "",
  script_adherence: "",
  creator_speech_style: "",
  brand_pronunciation_guide: "",
  main_objective: "",
  key_message: "",
  brand_values: "",
  target_audience: "",
  product_or_service: "",
  key_features_benefits: "",
  technical_details: "",
  video_tone: "",
  reference_ugc_videos: "",
  call_to_action: "",
  competitive_differentiators: "",
  additional_details: "",
};