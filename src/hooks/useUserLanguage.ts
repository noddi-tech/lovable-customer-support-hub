import { useEffect, useState } from 'react';
import i18n from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUserLanguage() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        console.log('Initializing i18n, current status:', i18n.isInitialized);
        
        // Wait for i18n to be initialized with timeout
        if (!i18n.isInitialized) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('i18n initialization timeout'));
            }, 5000);
            
            if (i18n.isInitialized) {
              clearTimeout(timeout);
              resolve(void 0);
            } else {
              i18n.on('initialized', () => {
                clearTimeout(timeout);
                resolve(void 0);
              });
            }
          });
        }

        console.log('i18n initialized, current language:', i18n.language);

        // For authenticated users, try to load their language preference
        if (user) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('preferred_language')
              .eq('user_id', user.id)
              .single();

            if (profile?.preferred_language && profile.preferred_language !== i18n.language) {
              console.log('Changing language to:', profile.preferred_language);
              await i18n.changeLanguage(profile.preferred_language);
            }
          } catch (error) {
            console.error('Failed to load user language preference:', error);
            // Continue with browser/localStorage language
          }
        }
        
        console.log('Language initialization complete');
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize language:', error);
        setIsReady(true); // Set ready even on error to prevent blocking
      }
    };

    initializeLanguage();
  }, [user]);

  return { i18n, isReady };
}