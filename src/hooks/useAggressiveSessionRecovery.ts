import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionHealthState {
  isHealthy: boolean;
  lastCheck: Date | null;
  authUidValid: boolean;
  sessionValid: boolean;
  profileExists: boolean;
  organizationValid: boolean;
  consecutiveFailures: number;
}

// Aircall localStorage keys to preserve during nuclear reset
const AIRCALL_STORAGE_KEYS = [
  'aircall_phone_logged_in',
  'aircall_phone_session',
  'aircall_connection_timestamp',
  'aircall_connection_attempts'
];

export function useAggressiveSessionRecovery() {
  const { user, session, refreshSession, validateSession, signOut } = useAuth();
  const [healthState, setHealthState] = useState<SessionHealthState>({
    isHealthy: false,
    lastCheck: null,
    authUidValid: false,
    sessionValid: false,
    profileExists: false,
    organizationValid: false,
    consecutiveFailures: 0
  });
  const [isRecovering, setIsRecovering] = useState(false);
  const lastHealthCheckRef = useRef<Date | null>(null);
  const isDocumentVisible = useRef(true);

  const performHealthCheck = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 Performing aggressive session health check...');
      
      // Check 1: Validate session context with database
      const { data: sessionContext } = await supabase.rpc('validate_session_context');
      
      if (!sessionContext || !Array.isArray(sessionContext) || sessionContext.length === 0) {
        throw new Error('Session context validation failed');
      }

      const {
        auth_uid,
        session_valid,
        organization_id,
        profile_exists
      } = sessionContext[0];

      const isHealthy = !!(auth_uid && session_valid && organization_id && profile_exists);
      
      setHealthState(prev => ({
        isHealthy,
        lastCheck: new Date(),
        authUidValid: !!auth_uid,
        sessionValid: !!session_valid,
        profileExists: !!profile_exists,
        organizationValid: !!organization_id,
        consecutiveFailures: isHealthy ? 0 : prev.consecutiveFailures + 1
      }));

      console.log('🔍 Health check result:', {
        isHealthy,
        auth_uid,
        session_valid,
        organization_id,
        profile_exists
      });

      return isHealthy;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      setHealthState(prev => ({
        ...prev,
        isHealthy: false,
        lastCheck: new Date(),
        consecutiveFailures: prev.consecutiveFailures + 1
      }));
      return false;
    }
  }, []);

  const nuclearSessionReset = useCallback(async (): Promise<boolean> => {
    if (isRecovering) return false;
    
    setIsRecovering(true);
    console.log('💥 Initiating nuclear session reset...');

    try {
      // Step 1: Save Aircall-related localStorage keys
      const aircallData: Record<string, string> = {};
      AIRCALL_STORAGE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          aircallData[key] = value;
          console.log(`💾 Preserved Aircall key: ${key}`);
        }
      });

      // Step 2: Clear ALL local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Step 3: Restore Aircall localStorage keys
      Object.entries(aircallData).forEach(([key, value]) => {
        localStorage.setItem(key, value);
        console.log(`♻️ Restored Aircall key: ${key}`);
      });
      
      // Step 4: Clear Supabase session
      await supabase.auth.signOut({ scope: 'global' });
      
      // Step 5: Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 6: Redirect without full reload to preserve Aircall SDK state
      toast.success('Session reset complete. Redirecting to login...');
      
      setTimeout(() => {
        window.location.replace('/auth');
      }, 1500);
      
      return true;
    } catch (error) {
      console.error('💥 Nuclear reset failed:', error);
      toast.error('Session reset failed. Please clear browser data manually.');
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [isRecovering]);

  const aggressiveRecovery = useCallback(async (): Promise<boolean> => {
    if (isRecovering) return false;
    
    setIsRecovering(true);
    console.log('🚀 Starting aggressive session recovery...');

    try {
      // Step 1: Try silent token refresh first (no UI disturbance)
      console.log('🔄 Attempting silent token refresh...');
      const { data: { session: silentSession } } = await supabase.auth.refreshSession();
      
      if (silentSession) {
        console.log('✅ Silent refresh successful');
        await new Promise(resolve => setTimeout(resolve, 500));
        const isHealthy = await performHealthCheck();
        
        if (isHealthy) {
          setIsRecovering(false);
          return true;
        }
      }

      // Step 2: Try normal session refresh
      console.log('🔄 Attempting normal session refresh...');
      const newSession = await refreshSession();
      
      if (newSession) {
        // Wait and validate
        await new Promise(resolve => setTimeout(resolve, 1000));
        const isHealthy = await performHealthCheck();
        
        if (isHealthy) {
          console.log('✅ Normal refresh successful');
          toast.success('Session recovered successfully');
          setIsRecovering(false);
          return true;
        }
      }

      // Step 3: Only use nuclear reset as last resort (requires 4+ consecutive failures)
      if (healthState.consecutiveFailures >= 4) {
        console.log('💥 Multiple failures detected, trying nuclear reset...');
        return await nuclearSessionReset();
      } else {
        console.log('⚠️ Recovery failed but not enough failures for nuclear reset');
        setIsRecovering(false);
        return false;
      }
      
    } catch (error) {
      console.error('🚀 Aggressive recovery failed:', error);
      setIsRecovering(false);
      return false;
    }
  }, [refreshSession, performHealthCheck, nuclearSessionReset, isRecovering, healthState.consecutiveFailures]);

  // Track document visibility to pause health checks when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocumentVisible.current = !document.hidden;
      console.log(`👁️ Document visibility changed: ${isDocumentVisible.current ? 'visible' : 'hidden'}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Less aggressive health check with exponential backoff
  useEffect(() => {
    if (!user || !session) return;

    const getCheckInterval = (failures: number): number => {
      // Base interval: 3 minutes, with exponential backoff
      const baseInterval = 180000; // 3 minutes
      const backoffMultiplier = Math.min(Math.pow(1.5, failures), 4);
      return baseInterval * backoffMultiplier;
    };

    const runHealthCheck = () => {
      // Skip health check if document is hidden
      if (!isDocumentVisible.current) {
        console.log('⏸️ Skipping health check - document is hidden');
        return;
      }

      // Skip if recently checked (within last minute when visible)
      const now = new Date();
      if (lastHealthCheckRef.current) {
        const timeSinceLastCheck = now.getTime() - lastHealthCheckRef.current.getTime();
        if (timeSinceLastCheck < 60000) {
          return;
        }
      }

      lastHealthCheckRef.current = now;
      
      performHealthCheck().then(isHealthy => {
        if (!isHealthy && healthState.consecutiveFailures >= 3) {
          console.log('🚨 Multiple health check failures (3+), triggering recovery...');
          aggressiveRecovery();
        }
      });
    };

    // Initial health check after 15 seconds (give tab time to settle)
    const initialTimeout = setTimeout(runHealthCheck, 15000);
    
    // Set up interval with dynamic timing based on failures
    const interval = setInterval(runHealthCheck, getCheckInterval(healthState.consecutiveFailures));

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [user, session, performHealthCheck, aggressiveRecovery, healthState.consecutiveFailures]);

  return {
    healthState,
    isRecovering,
    performHealthCheck,
    aggressiveRecovery,
    nuclearSessionReset,
    canRecover: !!user && !!session && !isRecovering
  };
}