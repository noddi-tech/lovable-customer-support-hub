import { useState, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SessionRecoveryState {
  isRecovering: boolean;
  retryCount: number;
  lastError: string | null;
}

export function useSessionRecovery() {
  const { refreshSession, validateSession } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<SessionRecoveryState>({
    isRecovering: false,
    retryCount: 0,
    lastError: null
  });

  const recoverSession = useCallback(async (): Promise<boolean> => {
    if (state.isRecovering) {
      console.log('Session recovery already in progress');
      return false;
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
      retryCount: prev.retryCount + 1
    }));

    try {
      console.log('Starting session recovery...');
      
      // First, try to refresh the session
      const newSession = await refreshSession();
      
      if (!newSession) {
        throw new Error('Session refresh failed - no session returned');
      }

      // Validate the new session
      const isValid = await validateSession();
      
      if (!isValid) {
        throw new Error('Session validation failed after refresh');
      }

      console.log('Session recovery successful');
      setState(prev => ({
        ...prev,
        isRecovering: false,
        lastError: null
      }));

      toast.success('Session restored successfully');
      return true;

    } catch (error: any) {
      console.error('Session recovery failed:', error);
      
      const errorMessage = error?.message || 'Unknown error';
      setState(prev => ({
        ...prev,
        isRecovering: false,
        lastError: errorMessage
      }));

      // Show different messages based on retry count
      if (state.retryCount >= 3) {
        toast.error('Unable to restore session. Please log in again.');
        // Navigate to auth after multiple failures
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      } else {
        toast.error(`Session recovery failed (attempt ${state.retryCount})`);
      }

      return false;
    }
  }, [refreshSession, validateSession, state.isRecovering, state.retryCount]);

  const resetRecovery = useCallback(() => {
    setState({
      isRecovering: false,
      retryCount: 0,
      lastError: null
    });
  }, []);

  return {
    ...state,
    recoverSession,
    resetRecovery,
    canRetry: state.retryCount < 3 && !state.isRecovering
  };
}