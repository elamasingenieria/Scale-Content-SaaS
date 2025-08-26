import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminVideoRequest {
  id: string;
  user_id: string;
  status: 'QUEUED' | 'IDEATION' | 'PRE_REVIEW_PENDING' | 'PRE_APPROVED' | 'GENERATING' | 'EDITING' | 'POST_REVIEW_PENDING' | 'POST_APPROVED' | 'READY' | 'EXPORTED' | 'FAILED';
  created_at: string;
  updated_at: string;
  failure_count: number | null;
  failure_reason: string | null;
  last_webhook_received_at: string | null;
  processing_started_at: string | null;
  user_email?: string;
  assets?: Array<{
    id: string;
    request_id: string;
    kind: 'branding' | 'broll' | 'script' | 'thumbnail' | 'edited_video';
    path: string;
    metadata: any;
    is_private: boolean;
    created_at: string;
    signed_url?: string;
  }>;
}

interface UseAdminVideoRequestsProps {
  status?: string;
  userEmail?: string;
  autoRefresh?: boolean;
}

export const useAdminVideoRequests = ({
  status = 'all',
  userEmail = '',
  autoRefresh = false
}: UseAdminVideoRequestsProps = {}) => {
  const { data: videoRequests, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-video-requests', status, userEmail],
    queryFn: async () => {
      let query = supabase
        .from('video_requests')
        .select(`
          id,
          user_id,
          status,
          created_at,
          updated_at,
          failure_count,
          failure_reason,
          last_webhook_received_at,
          processing_started_at,
          profiles!inner(email),
          video_request_assets(
            id,
            request_id,
            kind,
            path,
            metadata,
            is_private,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      // Apply filters
      if (status !== 'all') {
        query = query.eq('status', status as any);
      }

      if (userEmail) {
        query = query.ilike('profiles.email', `%${userEmail}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Generate signed URLs for video assets
      const requestsWithSignedUrls = await Promise.all(
        (data || []).map(async (request: any) => {
          const assetsWithUrls = await Promise.all(
            (request.video_request_assets || []).map(async (asset: any) => {
              if (asset.kind === 'edited_video') {
                const { data: signedUrlData } = await supabase.storage
                  .from('artifacts')
                  .createSignedUrl(asset.path, 86400); // 24 hours

                return {
                  ...asset,
                  signed_url: signedUrlData?.signedUrl
                };
              }
              return asset;
            })
          );

          return {
            ...request,
            user_email: request.profiles?.email,
            assets: assetsWithUrls
          };
        })
      );

      return requestsWithSignedUrls as AdminVideoRequest[];
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds when enabled
  });

  const stats = videoRequests ? {
    total: videoRequests.length,
    queued: videoRequests.filter(r => r.status === 'QUEUED').length,
    processing: videoRequests.filter(r => ['IDEATION', 'GENERATING', 'EDITING'].includes(r.status)).length,
    ready: videoRequests.filter(r => r.status === 'READY').length,
    failed: videoRequests.filter(r => r.status === 'FAILED').length,
  } : null;

  return {
    videoRequests: videoRequests || [],
    loading: isLoading,
    error,
    refetch,
    stats,
  };
};