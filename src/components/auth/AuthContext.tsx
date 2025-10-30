import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { logger } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      
      setSession(session);
      setUser(session?.user ?? null);
      return session;
    } catch (error) {
      logger.error('Session refresh failed', error, 'Auth');
      setSession(null);
      setUser(null);
      return null;
    }
  };

  const validateSession = async (retryCount = 0) => {
    if (!session) {
      logger.debug('No session to validate', undefined, 'Auth');
      return false;
    }
    
    try {
      // Test if the session is valid by making a simple query that requires auth
      const { error } = await supabase.rpc('get_user_organization_id');
      
      if (error) {
        logger.debug('Session validation failed', { code: error.code, message: error.message }, 'Auth');
        
        // Handle specific auth error codes
        if (error.code === 'PGRST301' || 
            error.message?.includes('JWT expired') ||
            error.message?.includes('refresh_token_not_found') ||
            error.code === 'PGRST116') {
          
          logger.info('Session invalid, attempting refresh', undefined, 'Auth');
          const newSession = await refreshSession();
          
          if (newSession && retryCount < 2) {
            // Retry validation once with the new session
            await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay
            return await validateSession(retryCount + 1);
          }
          
          return !!newSession;
        }
        
        // Other errors might not be auth-related
        return false;
      }
      
      logger.debug('Session validation successful', undefined, 'Auth');
      return true;
    } catch (error) {
      logger.error('Session validation failed', error, 'Auth');
      
      // If we haven't tried refreshing yet, attempt it
      if (retryCount === 0) {
        logger.info('Attempting session refresh due to validation error', undefined, 'Auth');
        const newSession = await refreshSession();
        if (newSession) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return await validateSession(1);
        }
      }
      
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        const previousUser = user;
        const newUser = session?.user ?? null;
        
        logger.info('Auth state changed', { 
          event,
          hasSession: !!session, 
          userId: newUser?.id,
          sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
        }, 'Auth');
        
        setSession(session);
        setUser(newUser);
        setLoading(false);
        
        // Clear user-specific cached data when authentication state changes
        if (event === 'SIGNED_OUT' || (!previousUser && !newUser) || (previousUser?.id !== newUser?.id)) {
          // Only clear user-specific queries, preserve historical data like Noddi
          queryClient.removeQueries({ queryKey: ['conversations'] });
          queryClient.removeQueries({ queryKey: ['inbox-counts'] });
          queryClient.removeQueries({ queryKey: ['all-counts'] });
          queryClient.removeQueries({ queryKey: ['users'] });
          queryClient.removeQueries({ queryKey: ['inboxes'] });
          queryClient.removeQueries({ queryKey: ['notifications'] });
          logger.debug('Cleared user-specific query cache', { event }, 'Auth');
        }
        
        // Validate session after sign-in
        if (event === 'SIGNED_IN' && session) {
          setTimeout(() => validateSession(), 1000);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Validate existing session without redirect
      if (session) {
        await validateSession();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clean up ONLY Supabase-specific auth state, preserve Aircall
      const keysToRemove: string[] = [];
      
      Object.keys(localStorage).forEach((key) => {
        // Only remove Supabase-related keys, NOT Aircall keys
        if ((key.startsWith('supabase.auth.') || 
             key.includes('sb-') || 
             key === 'dev_auto_login_email') &&
            !key.toLowerCase().includes('aircall')) {
          keysToRemove.push(key);
        }
      });
      
      logger.debug('Removing Supabase auth keys', { count: keysToRemove.length }, 'Auth');
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Verify Aircall keys are still present
      const aircallKeys = Object.keys(localStorage).filter(k => k.toLowerCase().includes('aircall'));
      logger.debug('Preserved Aircall keys', { keys: aircallKeys }, 'Auth');
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        logger.error('Supabase signOut error', err, 'Auth');
      }
      
      // Phase 1 & 5: Dispatch navigation event (handled by App.tsx)
      logger.info('Signing out - dispatching navigation event', undefined, 'Auth');
      window.dispatchEvent(new CustomEvent('auth-navigate', { detail: { path: '/auth' } }));
    } catch (error) {
      logger.error('Error signing out', error, 'Auth');
      window.dispatchEvent(new CustomEvent('auth-navigate', { detail: { path: '/auth' } }));
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession,
    validateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};