import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SessionValidationState {
  isValid: boolean;
  isValidating: boolean;
  lastValidation: Date | null;
  error: string | null;
}

export function useSessionValidation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<SessionValidationState>({
    isValid: true,
    isValidating: false,
    lastValidation: null,
    error: null
  });

  const validateSession = useCallback(async () => {
    if (!user) {
      setState({
        isValid: false,
        isValidating: false,
        lastValidation: new Date(),
        error: 'No user session'
      });
      return false;
    }

    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      // Check if session is still valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setState({
          isValid: false,
          isValidating: false,
          lastValidation: new Date(),
          error: 'Session expired or invalid'
        });
        
        toast.error('Your session has expired. Please log in again.');
        navigate('/auth');
        return false;
      }

      // Validate profile and organization exist
      const { data: validationData, error: validationError } = await supabase
        .rpc('validate_session_context');

      if (validationError) {
        console.error('Session validation error:', validationError);
        setState({
          isValid: false,
          isValidating: false,
          lastValidation: new Date(),
          error: validationError.message
        });
        return false;
      }

      const validation = validationData?.[0];
      
      if (!validation?.session_valid || !validation?.profile_exists || !validation?.organization_id) {
        const errorMsg = !validation?.profile_exists 
          ? 'User profile not found'
          : !validation?.organization_id
          ? 'Organization not found'
          : 'Session validation failed';

        setState({
          isValid: false,
          isValidating: false,
          lastValidation: new Date(),
          error: errorMsg
        });
        
        toast.error(errorMsg + '. Please contact support or try logging out and back in.');
        return false;
      }

      setState({
        isValid: true,
        isValidating: false,
        lastValidation: new Date(),
        error: null
      });
      
      return true;
    } catch (error) {
      console.error('Session validation exception:', error);
      setState({
        isValid: false,
        isValidating: false,
        lastValidation: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }, [user, navigate]);

  // Validate on mount and when user changes
  useEffect(() => {
    if (user) {
      validateSession();
    }
  }, [user, validateSession]);

  return {
    ...state,
    validateSession,
    canRetry: !state.isValidating && state.error !== null
  };
}
