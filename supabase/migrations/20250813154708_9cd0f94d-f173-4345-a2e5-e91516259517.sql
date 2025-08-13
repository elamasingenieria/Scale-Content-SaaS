-- Fix ugc_script_forms RPC function to include creators_and_videos_count field
CREATE OR REPLACE FUNCTION public.rpc_upsert_ugc_script_form(p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Insert or update the form with corrected field mapping
  INSERT INTO public.ugc_script_forms (
    user_id,
    client_name,
    cantidad_creadores,
    creators_and_videos_count,  -- Added missing field
    especificaciones_creadores,
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
    COALESCE((p_payload->>'cantidad_creadores')::integer, 1),
    COALESCE((p_payload->>'cantidad_creadores')::text, '1'),  -- Map cantidad_creadores to creators_and_videos_count as text
    p_payload->>'especificaciones_creadores',
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
    cantidad_creadores = EXCLUDED.cantidad_creadores,
    creators_and_videos_count = EXCLUDED.creators_and_videos_count,  -- Added missing field to UPDATE
    especificaciones_creadores = EXCLUDED.especificaciones_creadores,
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
$function$;