import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
  'aircall_connection_attempts',
  'aircall_phone_settings',
  'aircall_user_data'
];

// Check if running in dev mode
const IS_DEV_MODE = import.meta.env.DEV;

export function useAggressiveSessionRecovery() {
  const navigate = useNavigate();
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
  const [circuitBreakerUntil, setCircuitBreakerUntil] = useState<number | null>(null);
  const lastHealthCheckRef = useRef<Date | null>(null);
  const isDocumentVisible = useRef(true);
  const tabBecameVisibleAtRef = useRef<number>(Date.now());

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
      // Step 1: Save all Aircall-related localStorage keys (including pattern matching)
      const aircallData: Record<string, string> = {};
      
      // Save explicitly defined keys
      AIRCALL_STORAGE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) {
          aircallData[key] = value;
        }
      });
      
      // Save any other keys containing 'aircall'
      Object.keys(localStorage).forEach(key => {
        if (key.toLowerCase().includes('aircall') && !aircallData[key]) {
          const value = localStorage.getItem(key);
          if (value) {
            aircallData[key] = value;
          }
        }
      });
      
      console.log('💾 Preserved Aircall keys:', Object.keys(aircallData).filter(k => aircallData[k]));

      // Step 2: Clear ALL local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Step 3: Restore Aircall localStorage keys
      let restoredCount = 0;
      Object.entries(aircallData).forEach(([key, value]) => {
        if (value) {
          localStorage.setItem(key, value);
          restoredCount++;
        }
      });
      
      console.log(`♻️ Restored ${restoredCount} Aircall keys`);
      
      // Step 4: Verify restoration
      const verifyKeys = AIRCALL_STORAGE_KEYS.filter(k => localStorage.getItem(k));
      console.log('✅ Verified Aircall keys after restore:', verifyKeys);
      
      // Step 5: Clear Supabase session
      await supabase.auth.signOut({ scope: 'global' });
      
      // Step 6: Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 7: Redirect without full reload to preserve Aircall SDK state
      toast.success('Session reset complete. Redirecting to login...');
      
      setTimeout(() => {
        console.log('💥 [SessionRecovery] Nuclear reset complete - navigating to /auth (no reload)');
        navigate('/auth', { replace: true });
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
    
    // Check circuit breaker
    if (circuitBreakerUntil && Date.now() < circuitBreakerUntil) {
      console.log('⚡ Circuit breaker active, skipping recovery until', new Date(circuitBreakerUntil));
      return false;
    }
    
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
          setCircuitBreakerUntil(null);
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
          setCircuitBreakerUntil(null);
          setIsRecovering(false);
          return true;
        }
      }

      // Step 3: Track failures and activate circuit breaker
      const newFailures = healthState.consecutiveFailures + 1;
      console.log(`❌ Recovery attempt ${newFailures} failed`);
      
      // Activate circuit breaker after 3 consecutive recovery failures
      if (newFailures >= 3) {
        const breakerDuration = 30 * 60 * 1000; // 30 minutes
        setCircuitBreakerUntil(Date.now() + breakerDuration);
        console.log('⚡ Circuit breaker activated for 30 minutes');
      }
      
      // Only use nuclear reset as last resort (requires 8+ consecutive failures)
      if (newFailures >= 8) {
        console.log('💥 Multiple failures detected (8+), trying nuclear reset...');
        return await nuclearSessionReset();
      } else {
        console.log(`⚠️ Recovery failed but not enough failures for nuclear reset (${newFailures}/8)`);
        setIsRecovering(false);
        return false;
      }
      
    } catch (error) {
      console.error('🚀 Aggressive recovery failed:', error);
      setIsRecovering(false);
      return false;
    }
  }, [refreshSession, performHealthCheck, nuclearSessionReset, isRecovering, healthState.consecutiveFailures, circuitBreakerUntil]);

  // Track document visibility to pause health checks when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      isDocumentVisible.current = isVisible;
      
      if (isVisible) {
        console.log('👁️ Tab became visible, setting grace period before resuming health checks');
        tabBecameVisibleAtRef.current = Date.now();
      } else {
        console.log('👁️ Tab hidden, pausing health checks');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Drastically less aggressive health check with exponential backoff
  useEffect(() => {
    // Disable in dev mode
    if (IS_DEV_MODE) {
      console.log('⚠️ Session health checks disabled in dev mode');
      return;
    }

    if (!user || !session) return;

    const getCheckInterval = (failures: number): number => {
      // Base interval: 10 minutes (drastically increased), with exponential backoff
      const baseInterval = 600000; // 10 minutes
      const backoffMultiplier = Math.min(Math.pow(1.5, failures), 4);
      return baseInterval * backoffMultiplier;
    };

    const runHealthCheck = () => {
      // Skip health check if document is hidden
      if (!isDocumentVisible.current) {
        console.log('⏸️ Skipping health check - document is hidden');
        return;
      }

      // Add grace period after tab becomes visible (60 seconds)
      const timeSinceVisible = Date.now() - tabBecameVisibleAtRef.current;
      if (timeSinceVisible < 60000) {
        console.log('⏸️ Skipping health check - within grace period after tab became visible');
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
        // Require 5+ consecutive failures before triggering recovery (increased from 3)
        if (!isHealthy && healthState.consecutiveFailures >= 5) {
          console.log('🚨 Multiple health check failures (5+), triggering recovery...');
          aggressiveRecovery();
        }
      });
    };

    // Initial health check after 30 seconds (give tab time to settle)
    const initialTimeout = setTimeout(runHealthCheck, 30000);
    
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