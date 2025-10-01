import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
      console.error('Session refresh failed:', error);
      setSession(null);
      setUser(null);
      return null;
    }
  };

  const validateSession = async (retryCount = 0) => {
    if (!session) {
      console.log('No session to validate');
      return false;
    }
    
    try {
      // Test if the session is valid by making a simple query that requires auth
      const { error } = await supabase.rpc('get_user_organization_id');
      
      if (error) {
        console.log('Session validation failed:', error.code, error.message);
        
        // Handle specific auth error codes
        if (error.code === 'PGRST301' || 
            error.message?.includes('JWT expired') ||
            error.message?.includes('refresh_token_not_found') ||
            error.code === 'PGRST116') {
          
          console.log('Session invalid, attempting refresh...');
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
      
      console.log('Session validation successful');
      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      
      // If we haven't tried refreshing yet, attempt it
      if (retryCount === 0) {
        console.log('Attempting session refresh due to validation error...');
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
        
        console.log('Auth state change:', event, { 
          hasSession: !!session, 
          userId: newUser?.id,
          sessionExpiry: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
        });
        
        setSession(session);
        setUser(newUser);
        setLoading(false);
        
        // Clear all cached data when authentication state changes
        if (event === 'SIGNED_OUT' || (!previousUser && !newUser) || (previousUser?.id !== newUser?.id)) {
          queryClient.clear();
          console.log('Cleared query cache due to auth state change:', event);
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
      
      console.log('Removing Supabase auth keys:', keysToRemove.length);
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Verify Aircall keys are still present
      const aircallKeys = Object.keys(localStorage).filter(k => k.toLowerCase().includes('aircall'));
      console.log('🚪 [AuthContext] Preserved Aircall keys:', aircallKeys);
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.error('Supabase signOut error:', err);
        // Continue even if this fails
      }
      
      // Phase 1 & 5: Navigate without full page reload
      console.log('🚪 [AuthContext] Signing out - navigating to /auth (no reload)');
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
      navigate('/auth', { replace: true });
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