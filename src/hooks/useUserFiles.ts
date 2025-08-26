import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export interface UserFile {
  id: string;
  user_id: string;
  request_id: string;
  file_path: string;
  public_url: string;
  file_type: string;
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
      return data as UserFile[];
    },
    enabled: !!userId,
  });

  return {
    userFiles: userFiles || [],
    loading: isLoading,
    error,
    refetch,
  };
};