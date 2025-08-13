-- Fix the security definer view issue by dropping and recreating without security_invoker
DROP VIEW public.v_user_metrics_summary;

-- Recreate the view without the problematic security setting
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