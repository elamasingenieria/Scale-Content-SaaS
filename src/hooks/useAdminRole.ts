import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from './useUserProfile';

export const useAdminRole = () => {
  const { userId, loading: userLoading } = useUserProfile();

  const { data: isAdmin, isLoading, error } = useQuery({
    queryKey: ['admin-role', userId],
    queryFn: async () => {
      if (!userId) {
        console.log('useAdminRole: No userId available');
        return false;
      }

      console.log('useAdminRole: Checking role for userId:', userId);

      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin'
      });

      if (error) {
        console.error('useAdminRole: RPC error:', error);
        throw error;
      }

      console.log('useAdminRole: RPC result:', data);
      return data || false;
    },
    enabled: !!userId,
  });

  // Total loading state includes both user loading and admin role loading
  const loading = userLoading || (!!userId && isLoading);

  console.log('useAdminRole state:', { 
    userId, 
    userLoading, 
    isLoading, 
    isAdmin, 
    totalLoading: loading 
  });

  return {
    isAdmin: !!isAdmin,
    loading,
    error,
  };
};