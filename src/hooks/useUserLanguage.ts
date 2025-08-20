import { useEffect, useState } from 'react';
import i18n from '@/lib/i18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useUserLanguage() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(i18n.isInitialized); // Start with current state

  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        console.log('🔄 useUserLanguage: Starting language setup...');
        console.log('Current i18n status:', {
          isInitialized: i18n.isInitialized,
          language: i18n.language,
          hasResources: Object.keys(i18n.services?.resourceStore?.data || {}).length > 0
        });
        
        // If i18n is already ready, proceed immediately
        if (i18n.isInitialized) {
          console.log('✅ i18n already initialized, proceeding...');
        } else {
          // Wait for i18n with shorter timeout and better error handling
          console.log('⏳ Waiting for i18n initialization...');
          
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              console.warn('⚠️ i18n initialization timeout, proceeding anyway...');
              resolve(void 0); // Don't reject, just proceed
            }, 2000); // Shorter timeout
            
            if (i18n.isInitialized) {
              clearTimeout(timeout);
              resolve(void 0);
            } else {
              const onInitialized = () => {
                clearTimeout(timeout);
                i18n.off('initialized', onInitialized);
                console.log('✅ i18n initialized via event listener');
                resolve(void 0);
              };
              i18n.on('initialized', onInitialized);
            }
          });
        }

        console.log('📖 Current language after init:', i18n.language);

        // For authenticated users, try to load their language preference
        if (user) {
          try {
            console.log('👤 Loading user language preference...');
            const { data: profile } = await supabase
              .from('profiles')
              .select('preferred_language')
              .eq('user_id', user.id)
              .single();

            if (profile?.preferred_language && profile.preferred_language !== i18n.language) {
              console.log('🔄 Changing language to user preference:', profile.preferred_language);
              await i18n.changeLanguage(profile.preferred_language);
            } else {
              console.log('✅ Using current language (no user preference or already set)');
            }
          } catch (error) {
            console.warn('⚠️ Failed to load user language preference (continuing with default):', error);
            // Continue with browser/localStorage language
          }
        }
        
        console.log('✅ Language initialization complete:', {
          language: i18n.language,
          isReady: true
        });
        setIsReady(true);
      } catch (error) {
        console.error('❌ Language initialization error (proceeding anyway):', error);
        setIsReady(true); // Always set ready to prevent blocking
      }
    };

    // If already ready, don't reinitialize
    if (isReady) {
      console.log('✅ Language already ready, skipping initialization');
      return;
    }

    initializeLanguage();
  }, [user, isReady]);

  // Listen for i18n ready state changes
  useEffect(() => {
    if (i18n.isInitialized && !isReady) {
      console.log('🔄 i18n became ready, updating state');
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