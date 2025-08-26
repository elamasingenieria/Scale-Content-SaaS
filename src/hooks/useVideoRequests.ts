import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface VideoRequest {
  id: string;
  user_id: string;
  status: 'QUEUED' | 'IDEATION' | 'PRE_REVIEW_PENDING' | 'PRE_APPROVED' | 'GENERATING' | 'EDITING' | 'POST_REVIEW_PENDING' | 'POST_APPROVED' | 'READY' | 'EXPORTED' | 'FAILED';
  created_at: string;
  updated_at: string;
  assets?: VideoAsset[];
}

export interface VideoAsset {
  id: string;
  request_id: string;
  kind: 'branding' | 'broll' | 'script' | 'thumbnail' | 'edited_video';
  path: string;
  metadata: any;
  is_private: boolean;
  created_at: string;
  signed_url?: string;
}

export const useVideoRequests = () => {
  const { userId } = useUserProfile();

  const { data: videoRequests, isLoading, error, refetch } = useQuery({
    queryKey: ['video-requests', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('video_requests')
        .select(`
          id,
          user_id,
          status,
          created_at,
          updated_at,
          video_request_assets (
            id,
            request_id,
            kind,
            path,
            metadata,
            is_private,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for video assets
      const requestsWithSignedUrls = await Promise.all(
        (data || []).map(async (request) => {
          const assetsWithUrls = await Promise.all(
            (request.video_request_assets || []).map(async (asset) => {
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
            assets: assetsWithUrls
          };
        })
      );

      return requestsWithSignedUrls as VideoRequest[];
    },
    enabled: !!userId,
    refetchInterval: (query) => {
      // Auto-refresh every 30 seconds if there are requests in progress
      const data = query.state.data;
      const hasProcessingRequests = data?.some(req => 
        ['QUEUED', 'IDEATION', 'GENERATING', 'EDITING'].includes(req.status)
      );
      return hasProcessingRequests ? 30000 : false;
    },
  });

  return {
    videoRequests: videoRequests || [],
    loading: isLoading,
    error,
    refetch,
  };
};