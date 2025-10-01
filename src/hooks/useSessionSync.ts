import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SessionSyncState {
  isSyncing: boolean;
  lastSyncCheck: Date | null;
  syncAttempts: number;
}

export function useSessionSync() {
  const { user, session, refreshSession, validateSession } = useAuth();
  const [state, setState] = useState<SessionSyncState>({
    isSyncing: false,
    lastSyncCheck: null,
    syncAttempts: 0
  });

  const forceSessionSync = useCallback(async (): Promise<boolean> => {
    if (state.isSyncing) return false;

    setState(prev => ({ 
      ...prev, 
      isSyncing: true, 
      syncAttempts: prev.syncAttempts + 1 
    }));

    try {
      console.log('🔄 Force syncing session...');
      
      // Step 1: Validate current session
      const isValid = await validateSession();
      if (isValid) {
        console.log('✅ Session is already valid');
        setState(prev => ({ ...prev, isSyncing: false, lastSyncCheck: new Date() }));
        return true;
      }

      // Step 2: Try refreshing session
      console.log('🔄 Refreshing session...');
      const newSession = await refreshSession();
      
      if (!newSession) {
        console.log('❌ Session refresh failed, forcing re-login');
        await supabase.auth.signOut();
        toast.error('Session expired. Please log in again.');
        // Use replace to avoid adding to history
        window.location.replace('/auth');
        return false;
      }

      // Step 3: Wait for propagation and validate
      await new Promise(resolve => setTimeout(resolve, 1000));
      const finalValid = await validateSession();
      
      if (finalValid) {
        console.log('✅ Session sync successful');
        setState(prev => ({ ...prev, isSyncing: false, lastSyncCheck: new Date() }));
        toast.success('Session restored');
        return true;
      } else {
        console.log('❌ Session sync failed after refresh');
        setState(prev => ({ ...prev, isSyncing: false }));
        return false;
      }
    } catch (error) {
      console.error('Session sync error:', error);
      setState(prev => ({ ...prev, isSyncing: false }));
      return false;
    }
  }, [validateSession, refreshSession, state.isSyncing]);

  const checkSessionHealth = useCallback(async (): Promise<boolean> => {
    try {
      // Quick health check using a simple RPC
      const { error } = await supabase.rpc('get_user_organization_id');
      return !error;
    } catch {
      return false;
    }
  }, []);

  return {
    ...state,
    forceSessionSync,
    checkSessionHealth,
    hasSession: !!session && !!user,
    canSync: !state.isSyncing && state.syncAttempts < 3
  };
}