import { z } from "zod";

const urlSchema = z.string().url("URL inválida").or(z.literal(""));

export const socialLinksFormSchema = z.object({
  instagram_url: urlSchema.optional(),
  tiktok_url: urlSchema.optional(),
  youtube_url: urlSchema.optional(),
});

export type SocialLinksFormData = z.infer<typeof socialLinksFormSchema>;

export const socialLinksFormDefaults: SocialLinksFormData = {
  instagram_url: "",
  tiktok_url: "",
  youtube_url: "",
};