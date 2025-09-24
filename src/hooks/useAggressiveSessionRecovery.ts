import { useState, useCallback, useEffect } from 'react';
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
      // Step 1: Clear ALL local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Step 2: Clear Supabase session
      await supabase.auth.signOut({ scope: 'global' });
      
      // Step 3: Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Force reload to completely reset application state
      toast.success('Session reset complete. Redirecting to login...');
      
      setTimeout(() => {
        window.location.href = '/auth';
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
      // Step 1: Try normal session refresh first
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

      // Step 2: If normal refresh failed, try nuclear reset
      console.log('💥 Normal refresh failed, trying nuclear reset...');
      return await nuclearSessionReset();
      
    } catch (error) {
      console.error('🚀 Aggressive recovery failed:', error);
      toast.error('Session recovery failed. Please log in again.');
      return false;
    } finally {
      setIsRecovering(false);
    }
  }, [refreshSession, performHealthCheck, nuclearSessionReset, isRecovering]);

  // Auto health check every 30 seconds
  useEffect(() => {
    if (!user || !session) return;

    const interval = setInterval(() => {
      performHealthCheck().then(isHealthy => {
        if (!isHealthy && healthState.consecutiveFailures >= 2) {
          console.log('🚨 Multiple health check failures, triggering recovery...');
          aggressiveRecovery();
        }
      });
    }, 30000);

    // Initial health check
    performHealthCheck();

    return () => clearInterval(interval);
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