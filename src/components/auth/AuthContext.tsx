import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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
      console.error('Session refresh failed:', error);
      setSession(null);
      setUser(null);
      return null;
    }
  };

  const validateSession = async () => {
    if (!session) return false;
    
    try {
      // Test if the session is valid by making a simple query
      const { error } = await supabase.from('profiles').select('user_id').eq('user_id', session.user.id).maybeSingle();
      
      if (error && (error.code === 'PGRST301' || error.message?.includes('JWT expired'))) {
        console.log('Session invalid, attempting refresh...');
        const newSession = await refreshSession();
        return !!newSession;
      }
      
      return !error;
    } catch (error) {
      console.error('Session validation failed:', error);
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
      
      // Validate existing session
      if (session) {
        const isValid = await validateSession();
        if (!isValid) {
          console.log('Existing session invalid, redirecting to auth');
          window.location.href = '/auth';
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clean up auth state
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('dev_auto_login_email'); // Clean up dev flag
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
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