import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SessionContextValue {
  sessionId: string | null;
}

const SessionContext = createContext<SessionContextValue>({ sessionId: null });

export function useSessionContext() {
  return useContext(SessionContext);
}

interface SessionTrackingProviderProps {
  children: ReactNode;
}

// Parse user agent to extract device and browser info
function parseUserAgent(ua: string): { deviceType: string; browser: string } {
  let deviceType = 'desktop';
  let browser = 'unknown';

  if (/mobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet';
  }

  if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
    browser = 'Chrome';
  } else if (/firefox/i.test(ua)) {
    browser = 'Firefox';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Safari';
  } else if (/edge|edg/i.test(ua)) {
    browser = 'Edge';
  } else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
  }

  return { deviceType, browser };
}

export function SessionTrackingProvider({ children }: SessionTrackingProviderProps) {
  const { user, profile } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let isMounted = true;

    const createSession = async () => {
      if (!user?.id || !user?.email || sessionIdRef.current) return;

      const userAgent = navigator.userAgent;
      const { deviceType, browser } = parseUserAgent(userAgent);

      try {
        const { data, error } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            email: user.email,
            organization_id: profile?.organization_id || null,
            session_type: 'login',
            user_agent: userAgent,
            device_type: deviceType,
            browser: browser,
            is_active: true,
          })
          .select('id')
          .single();

        if (!error && data && isMounted) {
          sessionIdRef.current = data.id;

          // Start heartbeat
          heartbeatRef.current = setInterval(async () => {
            if (sessionIdRef.current) {
              await supabase
                .from('user_sessions')
                .update({ last_active_at: new Date().toISOString() })
                .eq('id', sessionIdRef.current);
            }
          }, 5 * 60 * 1000); // Every 5 minutes
        }
      } catch (err) {
        console.error('Session creation error:', err);
      }
    };

    const endSession = async (reason: string) => {
      if (!sessionIdRef.current) return;

      try {
        await supabase
          .from('user_sessions')
          .update({
            ended_at: new Date().toISOString(),
            is_active: false,
            end_reason: reason,
          })
          .eq('id', sessionIdRef.current);
      } catch (err) {
        console.error('Session end error:', err);
      }

      sessionIdRef.current = null;
    };

    if (user?.id) {
      createSession();
    }

    // Handle page unload
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Synchronous attempt via sendBeacon won't work for PATCH
        // But we can at least try
        endSession('page_close');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      if (sessionIdRef.current) {
        endSession('unmount');
      }
    };
  }, [user?.id, user?.email, profile?.organization_id]);

  return (
    <SessionContext.Provider value={{ sessionId: sessionIdRef.current }}>
      {children}
    </SessionContext.Provider>
  );
}
