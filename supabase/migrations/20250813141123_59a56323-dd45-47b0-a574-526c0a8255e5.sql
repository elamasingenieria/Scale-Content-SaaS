-- Add unique constraint to ugc_script_forms table for upsert functionality
ALTER TABLE public.ugc_script_forms ADD CONSTRAINT ugc_script_forms_user_id_unique UNIQUE (user_id);