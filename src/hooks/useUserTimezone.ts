import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function useUserTimezone() {
  const { user } = useAuth();
  
  // Memoize browser timezone to prevent recalculation
  const browserTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  // Use React Query for optimized caching and deduplication
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['user-timezone', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone, time_format')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - timezone rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.code === 'PGRST116') return false;
      return failureCount < 2;
    },
    meta: {
      errorHandler: (error: any) => {
        console.error('Failed to load user timezone:', error);
      }
    }
  });

  // Auto-update timezone if user exists but no timezone is set
  useEffect(() => {
    const autoUpdateTimezone = async () => {
      if (user && profile === null && !isLoading && !error) {
        try {
          await supabase
            .from('profiles')
            .update({ 
              timezone: browserTimezone, 
              time_format: '12h' 
            })
            .eq('user_id', user.id);
        } catch (error) {
          console.error('Failed to auto-update timezone:', error);
        }
      }
    };

    autoUpdateTimezone();
  }, [user, profile, isLoading, error, browserTimezone]);

  // Memoized return values to prevent unnecessary re-renders
  return useMemo(() => ({
    timezone: profile?.timezone || browserTimezone,
    timeFormat: profile?.time_format || '12h',
    isLoading: isLoading && !!user
  }), [profile, browserTimezone, isLoading, user]);
}