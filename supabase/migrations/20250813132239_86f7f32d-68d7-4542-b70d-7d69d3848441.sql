-- Add completion tracking fields to user_intake table
ALTER TABLE public.user_intake 
ADD COLUMN is_completed boolean DEFAULT false,
ADD COLUMN completed_at timestamptz,
ADD COLUMN metrics_scraped_at timestamptz;

-- Create enum for social media platforms
CREATE TYPE public.social_platform AS ENUM ('instagram', 'youtube', 'tiktok', 'facebook', 'twitter');

-- Create user_metrics table for storing scraped social media data
CREATE TABLE public.user_metrics (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    platform social_platform NOT NULL,
    handle text NOT NULL,
    followers_count integer,
    engagement_rate numeric(5,2), -- percentage with 2 decimal places
    avg_likes integer,
    avg_comments integer,
    posts_count integer,
    last_post_date timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT user_metrics_user_platform_unique UNIQUE (user_id, platform),
    CONSTRAINT user_metrics_engagement_rate_check CHECK (engagement_rate >= 0 AND engagement_rate <= 100),
    CONSTRAINT user_metrics_followers_check CHECK (followers_count >= 0),
    CONSTRAINT user_metrics_likes_check CHECK (avg_likes >= 0),
    CONSTRAINT user_metrics_comments_check CHECK (avg_comments >= 0),
    CONSTRAINT user_metrics_posts_check CHECK (posts_count >= 0)
);

-- Add indexes for performance
CREATE INDEX idx_user_metrics_user_id ON public.user_metrics(user_id);
CREATE INDEX idx_user_metrics_platform ON public.user_metrics(platform);
CREATE INDEX idx_user_metrics_updated_at ON public.user_metrics(updated_at);
CREATE INDEX idx_user_intake_completed ON public.user_intake(is_completed, completed_at);

-- Enable RLS on user_metrics
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_metrics - users can only see their own data
CREATE POLICY "user_metrics_select_self_or_admin" 
ON public.user_metrics 
FOR SELECT 
USING (
    (user_id = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "user_metrics_insert_self_or_admin" 
ON public.user_metrics 
FOR INSERT 
WITH CHECK (
    (user_id = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "user_metrics_update_self_or_admin" 
ON public.user_metrics 
FOR UPDATE 
USING (
    (user_id = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
    (user_id = auth.uid()) OR 
    has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "user_metrics_delete_admin_only" 
ON public.user_metrics 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger for user_metrics
CREATE TRIGGER update_user_metrics_updated_at
    BEFORE UPDATE ON public.user_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add webhook type enum for better tracking
CREATE TYPE public.webhook_type AS ENUM ('metrics_scraping', 'video_processing', 'stripe_payment', 'n8n_callback');

-- Update webhook_logs table to include user_id and webhook_type for better tracking
ALTER TABLE public.webhook_logs 
ADD COLUMN user_id uuid,
ADD COLUMN webhook_type webhook_type,
ADD COLUMN response_data jsonb;

-- Add index for webhook_logs user queries
CREATE INDEX idx_webhook_logs_user_id ON public.webhook_logs(user_id);
CREATE INDEX idx_webhook_logs_type ON public.webhook_logs(webhook_type);

-- Create function to mark intake as completed
CREATE OR REPLACE FUNCTION public.rpc_mark_intake_completed(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'p_user_id es requerido';
    END IF;

    -- Permisos: service_role, admin o el propio usuario
    IF current_user <> 'service_role' AND NOT (has_role(auth.uid(), 'admin') OR auth.uid() = p_user_id) THEN
        RAISE EXCEPTION 'Acceso denegado';
    END IF;

    -- Marcar como completado
    UPDATE public.user_intake 
    SET 
        is_completed = true,
        completed_at = now(),
        updated_at = now()
    WHERE user_id = p_user_id;

    RETURN FOUND;
END;
$$;

-- Create function to record metrics data
CREATE OR REPLACE FUNCTION public.rpc_record_user_metrics(
    p_user_id uuid,
    p_platform social_platform,
    p_handle text,
    p_followers_count integer DEFAULT NULL,
    p_engagement_rate numeric(5,2) DEFAULT NULL,
    p_avg_likes integer DEFAULT NULL,
    p_avg_comments integer DEFAULT NULL,
    p_posts_count integer DEFAULT NULL,
    p_last_post_date timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_id uuid;
BEGIN
    IF p_user_id IS NULL OR p_platform IS NULL OR p_handle IS NULL THEN
        RAISE EXCEPTION 'p_user_id, p_platform y p_handle son requeridos';
    END IF;

    -- Permisos: service_role, admin o el propio usuario
    IF current_user <> 'service_role' AND NOT (has_role(auth.uid(), 'admin') OR auth.uid() = p_user_id) THEN
        RAISE EXCEPTION 'Acceso denegado';
    END IF;

    -- Insertar o actualizar métricas
    INSERT INTO public.user_metrics (
        user_id, platform, handle, followers_count, engagement_rate, 
        avg_likes, avg_comments, posts_count, last_post_date
    )
    VALUES (
        p_user_id, p_platform, p_handle, p_followers_count, p_engagement_rate,
        p_avg_likes, p_avg_comments, p_posts_count, p_last_post_date
    )
    ON CONFLICT (user_id, platform) 
    DO UPDATE SET
        handle = EXCLUDED.handle,
        followers_count = EXCLUDED.followers_count,
        engagement_rate = EXCLUDED.engagement_rate,
        avg_likes = EXCLUDED.avg_likes,
        avg_comments = EXCLUDED.avg_comments,
        posts_count = EXCLUDED.posts_count,
        last_post_date = EXCLUDED.last_post_date,
        updated_at = now()
    RETURNING id INTO v_id;

    -- Actualizar timestamp de scraping en user_intake
    UPDATE public.user_intake 
    SET metrics_scraped_at = now()
    WHERE user_id = p_user_id;

    RETURN v_id;
END;
$$;

-- Create view for user metrics summary
CREATE VIEW public.v_user_metrics_summary AS
SELECT 
    um.user_id,
    json_object_agg(um.platform, json_build_object(
        'handle', um.handle,
        'followers_count', um.followers_count,
        'engagement_rate', um.engagement_rate,
        'avg_likes', um.avg_likes,
        'avg_comments', um.avg_comments,
        'posts_count', um.posts_count,
        'last_post_date', um.last_post_date,
        'updated_at', um.updated_at
    )) as platforms_data,
    COUNT(*) as platforms_count,
    MAX(um.updated_at) as last_updated
FROM public.user_metrics um
GROUP BY um.user_id;

-- RLS for the view
ALTER VIEW public.v_user_metrics_summary SET (security_invoker = on);