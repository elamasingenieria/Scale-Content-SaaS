-- Create user_files table for completed videos
CREATE TABLE public.user_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  request_id UUID REFERENCES public.video_requests(id),
  file_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'video',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "user_files_select_self_or_admin" 
ON public.user_files 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "user_files_insert_admin_only" 
ON public.user_files 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "user_files_update_admin_only" 
ON public.user_files 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "user_files_delete_admin_only" 
ON public.user_files 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_user_files_updated_at
  BEFORE UPDATE ON public.user_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_user_files_user_id ON public.user_files(user_id);
CREATE INDEX idx_user_files_request_id ON public.user_files(request_id);
CREATE INDEX idx_user_files_created_at ON public.user_files(created_at DESC);