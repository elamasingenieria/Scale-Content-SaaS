-- Crear ENUM para pre_approval_status
CREATE TYPE pre_approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Crear ENUM para edited_video_status  
CREATE TYPE edited_video_status AS ENUM ('processing', 'ready');

-- Agregar campos a video_requests para el sistema de aprobación
ALTER TABLE public.video_requests 
ADD COLUMN pre_approval_status pre_approval_status DEFAULT 'pending',
ADD COLUMN pre_approved_at timestamp with time zone,
ADD COLUMN pre_approved_by uuid,
ADD COLUMN rejection_reason text;

-- Crear tabla edited_videos
CREATE TABLE public.edited_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  original_request_id uuid NOT NULL REFERENCES public.video_requests(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  public_url text,
  status edited_video_status NOT NULL DEFAULT 'processing',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crear índices para optimización
CREATE INDEX idx_edited_videos_user_id ON public.edited_videos(user_id);
CREATE INDEX idx_edited_videos_original_request_id ON public.edited_videos(original_request_id);
CREATE INDEX idx_video_requests_pre_approval_status ON public.video_requests(pre_approval_status);

-- Habilitar RLS en edited_videos
ALTER TABLE public.edited_videos ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para edited_videos
CREATE POLICY "edited_videos_select_self_or_admin" 
ON public.edited_videos 
FOR SELECT 
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'));

CREATE POLICY "edited_videos_insert_admin_only" 
ON public.edited_videos 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "edited_videos_update_admin_only" 
ON public.edited_videos 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "edited_videos_delete_admin_only" 
ON public.edited_videos 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Crear trigger para updated_at en edited_videos
CREATE TRIGGER update_edited_videos_updated_at
BEFORE UPDATE ON public.edited_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Crear bucket para videos editados
INSERT INTO storage.buckets (id, name, public) VALUES ('edited-videos', 'edited-videos', false);

-- Crear políticas de storage para edited-videos bucket
CREATE POLICY "edited_videos_bucket_select_self_or_admin" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'edited-videos' AND (
  auth.uid()::text = (storage.foldername(name))[1] OR 
  has_role(auth.uid(), 'admin')
));

CREATE POLICY "edited_videos_bucket_insert_admin_only" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'edited-videos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "edited_videos_bucket_update_admin_only" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'edited-videos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "edited_videos_bucket_delete_admin_only" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'edited-videos' AND has_role(auth.uid(), 'admin'));