import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUserLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadUserLanguage = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('user_id', user.id)
          .single();

        if (profile?.preferred_language && profile.preferred_language !== i18n.language) {
          await i18n.changeLanguage(profile.preferred_language);
        }
      } catch (error) {
        console.error('Failed to load user language preference:', error);
      }
    };

    loadUserLanguage();
  }, [user, i18n]);

  return { i18n };
}