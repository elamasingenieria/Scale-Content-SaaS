import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export const useAdminRole = () => {
  const { userId } = useUserProfile();

  const { data: isAdmin, isLoading, error } = useQuery({
    queryKey: ['admin-role', userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });

      if (error) throw error;
      return data || false;
    },
    enabled: !!userId,
  });

  return {
    isAdmin: !!isAdmin,
    loading: isLoading,
    error,
  };
};