import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface UserFile {
  id: string;
  user_id: string;
  request_id: string;
  file_path: string;
  public_url: string;
  signed_url?: string;
  file_type: string;
  file_name: string;
  file_size?: number;
  created_at: string;
  updated_at: string;
}

export const useUserFiles = () => {
  const { userId } = useUserProfile();

  const { data: userFiles, isLoading, error, refetch } = useQuery({
    queryKey: ['user-files', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate signed URLs for private files and extract file names
      const filesWithSignedUrls = await Promise.all(
        (data as UserFile[]).map(async (file) => {
          let signedUrl = file.public_url;
          
          // If the file is in artifacts bucket (private), generate signed URL
          if (file.file_path.startsWith('artifacts/')) {
            const { data: urlData } = await supabase.storage
              .from('artifacts')
              .createSignedUrl(file.file_path.replace('artifacts/', ''), 3600); // 1 hour expiry
            
            if (urlData?.signedUrl) {
              signedUrl = urlData.signedUrl;
            }
          }

          // Extract file name from path
          const fileName = file.file_path.split('/').pop() || 'video.mp4';

          return {
            ...file,
            signed_url: signedUrl,
            file_name: fileName,
          };
        })
      );

      return filesWithSignedUrls;
    },
    enabled: !!userId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds for new videos
  });

  return {
    userFiles: userFiles || [],
    loading: isLoading,
    error,
    refetch,
  };
};