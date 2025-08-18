import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUserLanguage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Wait for i18n to be initialized
        if (!i18n.isInitialized) {
          await new Promise((resolve) => {
            if (i18n.isInitialized) {
              resolve(void 0);
            } else {
              i18n.on('initialized', resolve);
            }
          });
        }

        // For authenticated users, try to load their language preference
        if (user) {
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
            // Continue with browser/localStorage language
          }
        }
        
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize language:', error);
        setIsReady(true); // Set ready even on error to prevent blocking
      }
    };

    initializeLanguage();
  }, [user, i18n]);

  return { i18n, isReady };
}