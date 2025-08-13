-- Create UGC Script Forms table
CREATE TABLE public.ugc_script_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Datos del cliente
  client_name TEXT NOT NULL,
  creators_and_videos_count TEXT NOT NULL,
  
  -- Especificaciones del video
  video_duration TEXT NOT NULL,
  video_duration_other TEXT,
  
  -- Solo para producto
  product_display_timing TEXT,
  recording_formats TEXT[], -- array for multiple checkboxes
  recording_formats_other TEXT,
  existing_script_links TEXT,
  delivery_deadline DATE,
  
  -- Instrucciones para guion y producción
  app_parts_to_show TEXT,
  recording_locations TEXT,
  creator_clothing TEXT,
  creator_clothing_other TEXT,
  creator_appearance_style TEXT,
  creator_appearance_style_other TEXT,
  creator_activity_while_talking TEXT,
  
  -- Solo para apps
  app_display_method TEXT,
  
  -- Estilo y guion
  script_adherence TEXT,
  creator_speech_style TEXT,
  brand_pronunciation_guide TEXT,
  
  -- Objetivos y estrategia
  main_objective TEXT,
  key_message TEXT,
  brand_values TEXT,
  target_audience TEXT,
  product_or_service TEXT,
  key_features_benefits TEXT,
  technical_details TEXT,
  video_tone TEXT,
  reference_ugc_videos TEXT,
  call_to_action TEXT,
  competitive_differentiators TEXT,
  
  -- Otros
  additional_details TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create User Social Links table
CREATE TABLE public.user_social_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  instagram_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.ugc_script_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_social_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ugc_script_forms
CREATE POLICY "ugc_script_forms_select_self_or_admin" 
ON public.ugc_script_forms 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "ugc_script_forms_insert_self_or_admin" 
ON public.ugc_script_forms 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "ugc_script_forms_update_self_or_admin" 
ON public.ugc_script_forms 
FOR UPDATE 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "ugc_script_forms_delete_admin_only" 
ON public.ugc_script_forms 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_social_links
CREATE POLICY "user_social_links_select_self_or_admin" 
ON public.user_social_links 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "user_social_links_insert_self_or_admin" 
ON public.user_social_links 
FOR INSERT 
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "user_social_links_update_self_or_admin" 
ON public.user_social_links 
FOR UPDATE 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "user_social_links_delete_admin_only" 
ON public.user_social_links 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Add updated_at triggers
CREATE TRIGGER update_ugc_script_forms_updated_at
BEFORE UPDATE ON public.ugc_script_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_social_links_updated_at
BEFORE UPDATE ON public.user_social_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_ugc_script_forms_user_id ON public.ugc_script_forms(user_id);
CREATE INDEX idx_ugc_script_forms_created_at ON public.ugc_script_forms(created_at);
CREATE INDEX idx_user_social_links_user_id ON public.user_social_links(user_id);

-- Create RPC functions for upsert operations
CREATE OR REPLACE FUNCTION public.rpc_upsert_ugc_script_form(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Requiere autenticación';
  END IF;
  IF p_payload IS NULL THEN
    RAISE EXCEPTION 'payload es requerido';
  END IF;

  -- Insert or update the form
  INSERT INTO public.ugc_script_forms (
    user_id,
    client_name,
    creators_and_videos_count,
    video_duration,
    video_duration_other,
    product_display_timing,
    recording_formats,
    recording_formats_other,
    existing_script_links,
    delivery_deadline,
    app_parts_to_show,
    recording_locations,
    creator_clothing,
    creator_clothing_other,
    creator_appearance_style,
    creator_appearance_style_other,
    creator_activity_while_talking,
    app_display_method,
    script_adherence,
    creator_speech_style,
    brand_pronunciation_guide,
    main_objective,
    key_message,
    brand_values,
    target_audience,
    product_or_service,
    key_features_benefits,
    technical_details,
    video_tone,
    reference_ugc_videos,
    call_to_action,
    competitive_differentiators,
    additional_details
  )
  VALUES (
    v_uid,
    p_payload->>'client_name',
    p_payload->>'creators_and_videos_count',
    p_payload->>'video_duration',
    p_payload->>'video_duration_other',
    p_payload->>'product_display_timing',
    ARRAY(SELECT jsonb_array_elements_text(p_payload->'recording_formats')),
    p_payload->>'recording_formats_other',
    p_payload->>'existing_script_links',
    (p_payload->>'delivery_deadline')::date,
    p_payload->>'app_parts_to_show',
    p_payload->>'recording_locations',
    p_payload->>'creator_clothing',
    p_payload->>'creator_clothing_other',
    p_payload->>'creator_appearance_style',
    p_payload->>'creator_appearance_style_other',
    p_payload->>'creator_activity_while_talking',
    p_payload->>'app_display_method',
    p_payload->>'script_adherence',
    p_payload->>'creator_speech_style',
    p_payload->>'brand_pronunciation_guide',
    p_payload->>'main_objective',
    p_payload->>'key_message',
    p_payload->>'brand_values',
    p_payload->>'target_audience',
    p_payload->>'product_or_service',
    p_payload->>'key_features_benefits',
    p_payload->>'technical_details',
    p_payload->>'video_tone',
    p_payload->>'reference_ugc_videos',
    p_payload->>'call_to_action',
    p_payload->>'competitive_differentiators',
    p_payload->>'additional_details'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    client_name = EXCLUDED.client_name,
    creators_and_videos_count = EXCLUDED.creators_and_videos_count,
    video_duration = EXCLUDED.video_duration,
    video_duration_other = EXCLUDED.video_duration_other,
    product_display_timing = EXCLUDED.product_display_timing,
    recording_formats = EXCLUDED.recording_formats,
    recording_formats_other = EXCLUDED.recording_formats_other,
    existing_script_links = EXCLUDED.existing_script_links,
    delivery_deadline = EXCLUDED.delivery_deadline,
    app_parts_to_show = EXCLUDED.app_parts_to_show,
    recording_locations = EXCLUDED.recording_locations,
    creator_clothing = EXCLUDED.creator_clothing,
    creator_clothing_other = EXCLUDED.creator_clothing_other,
    creator_appearance_style = EXCLUDED.creator_appearance_style,
    creator_appearance_style_other = EXCLUDED.creator_appearance_style_other,
    creator_activity_while_talking = EXCLUDED.creator_activity_while_talking,
    app_display_method = EXCLUDED.app_display_method,
    script_adherence = EXCLUDED.script_adherence,
    creator_speech_style = EXCLUDED.creator_speech_style,
    brand_pronunciation_guide = EXCLUDED.brand_pronunciation_guide,
    main_objective = EXCLUDED.main_objective,
    key_message = EXCLUDED.key_message,
    brand_values = EXCLUDED.brand_values,
    target_audience = EXCLUDED.target_audience,
    product_or_service = EXCLUDED.product_or_service,
    key_features_benefits = EXCLUDED.key_features_benefits,
    technical_details = EXCLUDED.technical_details,
    video_tone = EXCLUDED.video_tone,
    reference_ugc_videos = EXCLUDED.reference_ugc_videos,
    call_to_action = EXCLUDED.call_to_action,
    competitive_differentiators = EXCLUDED.competitive_differentiators,
    additional_details = EXCLUDED.additional_details,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rpc_upsert_user_social_links(p_instagram_url text DEFAULT NULL, p_tiktok_url text DEFAULT NULL, p_youtube_url text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Requiere autenticación';
  END IF;

  INSERT INTO public.user_social_links (user_id, instagram_url, tiktok_url, youtube_url)
  VALUES (v_uid, p_instagram_url, p_tiktok_url, p_youtube_url)
  ON CONFLICT (user_id) DO UPDATE SET
    instagram_url = EXCLUDED.instagram_url,
    tiktok_url = EXCLUDED.tiktok_url,
    youtube_url = EXCLUDED.youtube_url,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;