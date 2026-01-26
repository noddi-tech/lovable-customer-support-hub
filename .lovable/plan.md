

## Plan: Add Enhanced Debug Logging for Authentication Flow

### Goal
Add comprehensive debug logging throughout the authentication flow so that when issues occur, the console logs will clearly show exactly where the process failed and why.

---

## Part 1: Enhanced Logging in `AuthContext.tsx`

### 1.1 Add timing markers for OAuth processing

```typescript
// At the start of handleOAuthCallback
const handleOAuthCallback = async () => {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const startTime = Date.now();
    setIsProcessingOAuth(true);
    logger.info('OAuth callback detected', { 
      hashLength: hash.length,
      hasAccessToken: hash.includes('access_token'),
      hasRefreshToken: hash.includes('refresh_token'),
      pathname: window.location.pathname
    }, 'Auth');
    
    // Wait for Supabase to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.debug('OAuth wait completed', { elapsedMs: Date.now() - startTime }, 'Auth');
    
    // Get session
    const { data: { session }, error } = await supabase.auth.getSession();
    logger.info('OAuth getSession result', { 
      hasSession: !!session,
      userId: session?.user?.id,
      error: error?.message,
      elapsedMs: Date.now() - startTime
    }, 'Auth');
    
    // ... rest of logic
    logger.info('OAuth processing complete', { 
      success: !!session,
      userId: session?.user?.id,
      totalTimeMs: Date.now() - startTime
    }, 'Auth');
  }
  return false;
};
```

### 1.2 Add logging for initial session check

```typescript
// After OAuth callback check
handleOAuthCallback().then(async (wasCallback) => {
  logger.debug('Initial auth check', { wasCallback, mounted }, 'Auth');
  
  if (!wasCallback && mounted) {
    const { data: { session }, error } = await supabase.auth.getSession();
    logger.info('Initial session state', { 
      hasSession: !!session,
      userId: session?.user?.id,
      error: error?.message 
    }, 'Auth');
    
    if (mounted) {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      logger.debug('Auth state initialized', { 
        hasUser: !!session?.user,
        loading: false 
      }, 'Auth');
    }
  }
});
```

### 1.3 Enhanced onAuthStateChange logging

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    if (!mounted) {
      logger.debug('Auth state change ignored - unmounted', { event }, 'Auth');
      return;
    }
    
    const previousUserId = user?.id;
    const newUserId = session?.user?.id;
    
    logger.info('Auth state changed', { 
      event,
      previousUserId,
      newUserId,
      hasSession: !!session,
      sessionExpiry: session?.expires_at 
        ? new Date(session.expires_at * 1000).toISOString() 
        : null,
      isProcessingOAuth  // Include this to see coordination
    }, 'Auth');
    
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
    
    logger.debug('Auth state updated', { 
      loading: false,
      hasUser: !!session?.user 
    }, 'Auth');
  }
);
```

---

## Part 2: Enhanced Logging in `ProtectedRoute.tsx`

### 2.1 Add comprehensive state logging

```typescript
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, isProcessingOAuth } = useAuth();
  const navigate = useNavigate();

  // Log every render with full state
  useEffect(() => {
    logger.debug('ProtectedRoute render', { 
      loading, 
      isProcessingOAuth, 
      hasUser: !!user,
      userId: user?.id,
      pathname: window.location.pathname,
      hash: window.location.hash ? 'present' : 'none'
    }, 'ProtectedRoute');
  });

  useEffect(() => {
    logger.debug('ProtectedRoute effect triggered', { 
      loading, 
      isProcessingOAuth, 
      hasUser: !!user,
      willCheck: !loading && !isProcessingOAuth
    }, 'ProtectedRoute');

    if (!loading && !isProcessingOAuth) {
      if (!user) {
        logger.warn('No user after auth complete - starting redirect timer', {
          timerMs: 300
        }, 'ProtectedRoute');
        
        const timer = setTimeout(() => {
          // Re-check and log final state
          logger.info('Redirect timer fired', { 
            hasUser: !!user,
            willRedirect: !user
          }, 'ProtectedRoute');
          
          if (!user) {
            logger.warn('Redirecting to /auth', { 
              reason: 'No user after all loading complete',
              pathname: window.location.pathname
            }, 'ProtectedRoute');
            navigate('/auth', { replace: true });
          }
        }, 300);
        return () => {
          logger.debug('Redirect timer cancelled', undefined, 'ProtectedRoute');
          clearTimeout(timer);
        };
      } else {
        logger.debug('User authenticated - rendering children', { 
          userId: user.id 
        }, 'ProtectedRoute');
      }
    }
  }, [user, loading, isProcessingOAuth, navigate]);

  // Log what we're rendering
  if (loading || isProcessingOAuth) {
    logger.debug('Rendering loading state', { 
      loading, 
      isProcessingOAuth 
    }, 'ProtectedRoute');
    return (/* loading spinner */);
  }

  if (!user) {
    logger.debug('Rendering null - waiting for redirect', undefined, 'ProtectedRoute');
    return null;
  }

  return <>{children}</>;
};
```

---

## Part 3: Enhanced Logging in `useAuth.tsx`

### 3.1 Log data fetching states

```typescript
export const useAuth = () => {
  const { user, session, loading, signOut, isProcessingOAuth } = useSupabaseAuth();
  
  // Log when user changes
  useEffect(() => {
    logger.debug('useAuth user state', { 
      hasUser: !!user,
      userId: user?.id,
      loading,
      isProcessingOAuth
    }, 'useAuth');
  }, [user, loading, isProcessingOAuth]);

  // In profile query
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      logger.debug('Fetching profile', { userId: user?.id }, 'useAuth');
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        logger.error('Profile fetch failed', { error: error.message }, 'useAuth');
        return null;
      }

      logger.debug('Profile fetched', { 
        hasProfile: !!data,
        profileId: data?.id 
      }, 'useAuth');
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  // Similar logging for memberships query...
};
```

---

## Part 4: Add Logging in `Auth.tsx`

### 4.1 Log OAuth/Magic Link initiation

```typescript
const handleGoogleSignIn = async () => {
  setLoading(true);
  setError('');
  
  logger.info('Initiating Google OAuth', undefined, 'Auth');
  
  try {
    cleanupAuthState();
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    
    logger.info('Google OAuth response', { 
      hasData: !!data,
      url: data?.url ? 'present' : 'none',
      error: error?.message 
    }, 'Auth');
    
    if (error) throw error;
  } catch (error: any) {
    logger.error('Google OAuth failed', { error: error.message }, 'Auth');
    setError(error.message);
  }
};

const handleMagicLink = async (e: React.FormEvent) => {
  logger.info('Sending magic link', { email }, 'Auth');
  
  // ... existing logic
  
  if (error) {
    logger.error('Magic link failed', { error: error.message }, 'Auth');
  } else {
    logger.info('Magic link sent successfully', { email }, 'Auth');
  }
};
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/components/auth/AuthContext.tsx` | Add timing logs, OAuth processing details, session state |
| `src/components/auth/ProtectedRoute.tsx` | Log every state change, timer events, redirect decisions |
| `src/hooks/useAuth.tsx` | Log data fetching, user state changes |
| `src/pages/Auth.tsx` | Log OAuth/magic link initiation and responses |

---

## Expected Console Output (Success Case)

```
[INFO] [Auth] Initiating Google OAuth
[INFO] [Auth] Google OAuth response { hasData: true, url: 'present' }
-- User redirected to Google --
-- User returns to app --
[INFO] [Auth] OAuth callback detected { hasAccessToken: true, hasRefreshToken: true }
[DEBUG] [Auth] OAuth wait completed { elapsedMs: 1000 }
[INFO] [Auth] OAuth getSession result { hasSession: true, userId: '...' }
[INFO] [Auth] Auth state changed { event: 'SIGNED_IN', hasSession: true }
[DEBUG] [ProtectedRoute] render { loading: false, isProcessingOAuth: false, hasUser: true }
[DEBUG] [ProtectedRoute] User authenticated - rendering children
```

## Expected Console Output (Failure Case - Easy to Diagnose)

```
[INFO] [Auth] OAuth callback detected { hasAccessToken: true }
[DEBUG] [Auth] OAuth wait completed { elapsedMs: 1000 }
[INFO] [Auth] OAuth getSession result { hasSession: false, error: 'JWT expired' }
[DEBUG] [ProtectedRoute] render { loading: false, isProcessingOAuth: false, hasUser: false }
[WARN] [ProtectedRoute] No user after auth complete - starting redirect timer
[INFO] [ProtectedRoute] Redirect timer fired { hasUser: false, willRedirect: true }
[WARN] [ProtectedRoute] Redirecting to /auth { reason: 'No user after all loading complete' }
```

---

## Testing

After implementing these logs:
1. Open browser DevTools > Console
2. Attempt magic link or Google OAuth login
3. Watch the console for the complete authentication flow
4. If redirect loop occurs, logs will show exactly which step failed

