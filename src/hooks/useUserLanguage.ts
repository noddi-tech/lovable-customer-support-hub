import { useEffect, useState } from 'react';
import i18n from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export function useUserLanguage() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(i18n.isInitialized); // Start with current state

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // If i18n is already ready, proceed immediately
        if (i18n.isInitialized) {
          logger.debug('i18n already initialized', undefined, 'i18n');
        } else {
          // Wait for i18n with shorter timeout
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              logger.warn('i18n initialization timeout, proceeding anyway', undefined, 'i18n');
              resolve(void 0);
            }, 2000);
            
            if (i18n.isInitialized) {
              clearTimeout(timeout);
              resolve(void 0);
            } else {
              const onInitialized = () => {
                clearTimeout(timeout);
                i18n.off('initialized', onInitialized);
                resolve(void 0);
              };
              i18n.on('initialized', onInitialized);
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
              logger.info('Changing to user language preference', { language: profile.preferred_language }, 'i18n');
              await i18n.changeLanguage(profile.preferred_language);
            }
          } catch (error) {
            logger.warn('Failed to load user language preference', error, 'i18n');
          }
        }
        
        setIsReady(true);
      } catch (error) {
        logger.error('Language initialization error', error, 'i18n');
        setIsReady(true);
      }
    };

    // If already ready, don't reinitialize
    if (isReady) {
      return;
    }

    initializeLanguage();
  }, [user, isReady]);

  // Listen for i18n ready state changes
  useEffect(() => {
    if (i18n.isInitialized && !isReady) {
      setIsReady(true);
    }
  }, [isReady]);

  return { 
    i18n, 
    isReady,
    // Provide additional debug info
    debug: {
      language: i18n.language,
      initialized: i18n.isInitialized,
      hasResources: Object.keys(i18n.services?.resourceStore?.data || {}).length > 0
    }
  };
}