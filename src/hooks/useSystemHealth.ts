import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface SystemHealthState {
  // Overall
  isHealthy: boolean;
  lastCheck: Date | null;
  isChecking: boolean;
  
  // Frontend
  frontendUserExists: boolean;
  frontendSessionActive: boolean;
  frontendUserEmail: string | null;
  frontendUserId: string | null;
  
  // Database
  dbAuthUidValid: boolean;
  dbProfileExists: boolean;
  dbOrganizationId: string | null;
  dbDepartmentId: string | null;
  
  // Data Access
  dataAccessOk: boolean;
  conversationsCount: number;
  dataAccessError: string | null;
}

const initialState: SystemHealthState = {
  isHealthy: false,
  lastCheck: null,
  isChecking: false,
  frontendUserExists: false,
  frontendSessionActive: false,
  frontendUserEmail: null,
  frontendUserId: null,
  dbAuthUidValid: false,
  dbProfileExists: false,
  dbOrganizationId: null,
  dbDepartmentId: null,
  dataAccessOk: false,
  conversationsCount: 0,
  dataAccessError: null,
};

export function useSystemHealth() {
  const { user, session } = useAuth();
  const [healthState, setHealthState] = useState<SystemHealthState>(initialState);

  const runHealthCheck = useCallback(async () => {
    setHealthState(prev => ({ ...prev, isChecking: true }));
    
    const newState: SystemHealthState = {
      ...initialState,
      isChecking: false,
      lastCheck: new Date(),
      frontendUserExists: !!user,
      frontendSessionActive: !!session,
      frontendUserEmail: user?.email || null,
      frontendUserId: user?.id || null,
    };

    try {
      // Check session context with database
      const { data: sessionContext, error: sessionError } = await supabase.rpc('validate_session_context');
      
      if (!sessionError && sessionContext && Array.isArray(sessionContext) && sessionContext.length > 0) {
        const ctx = sessionContext[0];
        newState.dbAuthUidValid = !!ctx.auth_uid;
        newState.dbProfileExists = !!ctx.profile_exists;
        newState.dbOrganizationId = ctx.organization_id || null;
      }

      // Get department ID
      try {
        const { data: deptId } = await supabase.rpc('get_user_department_id');
        newState.dbDepartmentId = deptId || null;
      } catch (e) {
        // Optional field, ignore errors
      }

      // Check data access via conversations
      try {
        const { data: conversations, error: convError } = await supabase.rpc('get_conversations');
        if (convError) {
          newState.dataAccessOk = false;
          newState.dataAccessError = convError.message;
          newState.conversationsCount = -1;
        } else {
          newState.dataAccessOk = true;
          newState.conversationsCount = conversations?.length || 0;
        }
      } catch (e) {
        newState.dataAccessOk = false;
        newState.dataAccessError = (e as Error).message;
        newState.conversationsCount = -1;
      }

      // Calculate overall health
      newState.isHealthy = 
        newState.frontendUserExists && 
        newState.frontendSessionActive && 
        newState.dbAuthUidValid && 
        newState.dbProfileExists && 
        !!newState.dbOrganizationId &&
        newState.dataAccessOk;

    } catch (error) {
      console.error('Health check failed:', error);
      newState.dataAccessError = (error as Error).message;
    }

    setHealthState(newState);
    return newState.isHealthy;
  }, [user, session]);

  const forceRefresh = useCallback(async () => {
    try {
      await supabase.auth.refreshSession();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await runHealthCheck();
      return true;
    } catch (error) {
      console.error('Force refresh failed:', error);
      return false;
    }
  }, [runHealthCheck]);

  // Auto-run on mount
  useEffect(() => {
    const timer = setTimeout(() => runHealthCheck(), 500);
    return () => clearTimeout(timer);
  }, [runHealthCheck]);

  return {
    healthState,
    runHealthCheck,
    forceRefresh,
  };
}
