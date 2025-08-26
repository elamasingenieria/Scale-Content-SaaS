import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export const useUserProfile = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user ID
    const getCurrentUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      console.log('useUserProfile: Initial session check, userId:', userId);
      setUserId(userId);
    };

    getCurrentUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id || null;
      console.log('useUserProfile: Auth state change:', { event, userId });
      setUserId(userId);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return {
    profile,
    loading: isLoading || userId === null, // Include userId loading state
    error,
    refetch,
    userId,
  };
};