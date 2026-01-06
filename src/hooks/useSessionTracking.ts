import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SessionInfo {
  id: string;
  started_at: string;
}

// Parse user agent to extract device and browser info
function parseUserAgent(ua: string): { deviceType: string; browser: string } {
  let deviceType = 'desktop';
  let browser = 'unknown';

  // Device detection
  if (/mobile/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = 'tablet';
  }

  // Browser detection
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

export function useSessionTracking() {
  const { user, profile } = useAuth();
  const sessionRef = useRef<SessionInfo | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create a new session record
  const createSession = useCallback(async (sessionType: string = 'login') => {
    if (!user?.id || !user?.email) return null;

    const userAgent = navigator.userAgent;
    const { deviceType, browser } = parseUserAgent(userAgent);

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          email: user.email,
          organization_id: profile?.organization_id || null,
          session_type: sessionType,
          user_agent: userAgent,
          device_type: deviceType,
          browser: browser,
          is_active: true,
        })
        .select('id, started_at')
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        return null;
      }

      sessionRef.current = data;
      return data;
    } catch (err) {
      console.error('Session creation error:', err);
      return null;
    }
  }, [user?.id, user?.email, profile?.organization_id]);

  // Update last_active_at (heartbeat)
  const updateActivity = useCallback(async () => {
    if (!sessionRef.current?.id) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', sessionRef.current.id);
    } catch (err) {
      console.error('Heartbeat update failed:', err);
    }
  }, []);

  // End the current session
  const endSession = useCallback(async (reason: string = 'logout') => {
    if (!sessionRef.current?.id) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          ended_at: new Date().toISOString(),
          is_active: false,
          end_reason: reason,
        })
        .eq('id', sessionRef.current.id);

      sessionRef.current = null;
    } catch (err) {
      console.error('Session end failed:', err);
    }
  }, []);

  // Get current session ID
  const getSessionId = useCallback(() => {
    return sessionRef.current?.id || null;
  }, []);

  // Start heartbeat interval
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    // Update every 5 minutes
    heartbeatIntervalRef.current = setInterval(updateActivity, 5 * 60 * 1000);
  }, [updateActivity]);

  // Stop heartbeat interval
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Initialize session on mount if user is logged in
  useEffect(() => {
    if (user?.id && !sessionRef.current) {
      createSession('login').then(() => {
        startHeartbeat();
      });
    }

    return () => {
      stopHeartbeat();
    };
  }, [user?.id, createSession, startHeartbeat, stopHeartbeat]);

  // Handle page unload - end session
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionRef.current?.id) {
        // Use sendBeacon for reliable delivery on page close
        const payload = JSON.stringify({
          ended_at: new Date().toISOString(),
          is_active: false,
          end_reason: 'page_close',
        });
        
        navigator.sendBeacon(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionRef.current.id}`,
          payload
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    createSession,
    endSession,
    updateActivity,
    getSessionId,
    startHeartbeat,
    stopHeartbeat,
  };
}
