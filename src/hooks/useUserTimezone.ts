import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUserTimezone() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState<string>('UTC');
  const [timeFormat, setTimeFormat] = useState<string>('12h');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserTimezone = async () => {
      if (!user) {
        // Fallback to browser timezone for non-authenticated users
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(browserTimezone);
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('timezone, time_format')
          .eq('user_id', user.id)
          .single();

        if (profile?.timezone) {
          setTimezone(profile.timezone);
          setTimeFormat(profile.time_format || '12h');
        } else {
          // Auto-detect and save browser timezone if not set
          const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          setTimezone(browserTimezone);
          
          // Save the detected timezone to database
          await supabase
            .from('profiles')
            .update({ timezone: browserTimezone, time_format: '12h' })
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.error('Failed to load user timezone:', error);
        // Fallback to browser timezone
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(browserTimezone);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserTimezone();
  }, [user]);

  return { timezone, timeFormat, isLoading };
}