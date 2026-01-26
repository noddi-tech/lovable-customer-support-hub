

# Deep Analysis: Authentication Redirect Loop Root Cause

## Problem Identification

The user (anders@noddi.no) successfully authenticates in Supabase (confirmed by auth logs showing successful Google OAuth login), but gets redirected back to `/auth` in an infinite loop.

### Database State ✅
- User has valid profile in database
- Has active organization membership  
- All required data exists

### Supabase Auth ✅
- Auth logs confirm successful login
- JWT token is valid
- Session is established server-side

### Client-Side Race Condition ❌
The problem is in the **timing coordination** between multiple async processes:

## The Race Condition Flow

```
Timeline of Events (when user clicks OAuth redirect):

T+0ms:    User lands on app with #access_token in URL
          ↓
          AuthContext.handleOAuthCallback() detects hash
          ProtectedRoute mounts, detects hash
          
T+0ms:    AuthContext starts:
          - Wait 500ms for Supabase to process hash
          
T+0ms:    ProtectedRoute starts TWO useEffects:
          - Effect 1: Watching loading & user
          - Effect 2: Detects access_token, will setIsReady(true) at 1500ms
          
T+100ms:  onAuthStateChange fires (SIGNED_IN event)
          - Sets loading = false
          - Sets user = session.user
          - But mounted flag might not allow state update yet
          
T+100ms:  ProtectedRoute Effect 1 sees:
          - loading = false ✓
          - user = null ✗ (state update hasn't propagated)
          - Starts 500ms redirect timer ⚠️
          
T+500ms:  AuthContext.handleOAuthCallback completes:
          - Calls getSession()
          - Sets user & session
          - Cleans URL hash
          - Sets loading = false (again)
          
T+600ms:  ⚠️ REDIRECT TIMER FIRES ⚠️
          - ProtectedRoute's setTimeout(500) completes
          - Checks user (from closure, still null)
          - navigate('/auth') → LOOP!
          
T+1500ms: ProtectedRoute Effect 2 fires:
          - setIsReady(true) 
          - But user was already redirected
```

## Root Causes

### 1. **Loading State Set by Multiple Sources**
Both `onAuthStateChange` AND `handleOAuthCallback` set `loading = false`, causing non-deterministic timing.

**Code:** `AuthContext.tsx` lines 124, 147

### 2. **Redirect Timer Captures Stale User**
The `setTimeout` in ProtectedRoute captures `user` from the closure, not the latest value.

**Code:** `ProtectedRoute.tsx` lines 22-26
```typescript
setTimeout(() => {
  if (!user) {  // ← Checks OLD user value from closure
    navigate('/auth');
  }
}, 500);
```

### 3. **Competing Timers Don't Coordinate**
- AuthContext: 500ms to process OAuth
- ProtectedRoute Effect 1: 500ms before redirect
- ProtectedRoute Effect 2: 1500ms to set ready
- These timers race against each other

### 4. **No Unified OAuth Processing State**
Neither component knows when the OTHER is done processing OAuth.

## Solution Strategy

We need to **centralize OAuth state management** and **eliminate competing timers**.

### Approach A: Single Source of Truth in AuthContext ⭐ RECOMMENDED

**Changes:**
1. Add `isProcessingOAuth` state to `AuthContext`
2. Expose this to consumers via context
3. `ProtectedRoute` waits for BOTH `!loading` AND `!isProcessingOAuth`
4. Remove all timers from `ProtectedRoute`
5. Make `handleOAuthCallback` the ONLY place that manages OAuth timing

**Files to modify:**
- `src/components/auth/AuthContext.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/hooks/useAuth.tsx` (add isProcessingOAuth to return)

**Implementation:**

#### AuthContext.tsx
```typescript
const [loading, setLoading] = useState(true);
const [isProcessingOAuth, setIsProcessingOAuth] = useState(false); // NEW

const handleOAuthCallback = async () => {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    setIsProcessingOAuth(true); // Signal start
    logger.info('OAuth callback detected, processing tokens', undefined, 'Auth');
    
    // Wait for Supabase to process
    await new Promise(resolve => setTimeout(resolve, 1000)); // Increase to 1s
    
    // Get session
    const { data: { session } } = await supabase.auth.getSession();
    if (mounted && session) {
      setSession(session);
      setUser(session.user);
      window.history.replaceState(null, '', window.location.pathname);
    }
    
    setLoading(false);
    setIsProcessingOAuth(false); // Signal complete
    return true;
  }
  return false;
};

// In context value:
return (
  <AuthContext.Provider value={{
    user,
    session,
    loading,
    isProcessingOAuth, // NEW
    // ...
  }}>
```

#### ProtectedRoute.tsx
```typescript
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, isProcessingOAuth } = useAuth(); // Add isProcessingOAuth
  const navigate = useNavigate();

  useEffect(() => {
    // Only proceed when BOTH loading and OAuth processing are complete
    if (!loading && !isProcessingOAuth) {
      if (!user) {
        // Give one final moment for state propagation
        const timer = setTimeout(() => {
          if (!user) {
            logger.warn('No user after auth complete, redirecting to login', undefined, 'Auth');
            navigate('/auth', { replace: true });
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [user, loading, isProcessingOAuth, navigate]);

  // Show loading while authenticating OR processing OAuth
  if (loading || isProcessingOAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isProcessingOAuth ? 'Completing sign in...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
```

#### hooks/useAuth.tsx
```typescript
export const useAuth = () => {
  const { user, session, loading, signOut, refreshSession, validateSession } = useSupabaseAuth();
  const { isProcessingOAuth } = useSupabaseAuth(); // NEW
  
  // ... rest of code
  
  return {
    user,
    session,
    profile,
    loading: loading,
    isProcessingOAuth, // NEW
    isDataLoading: profileLoading || membershipsLoading,
    // ...
  };
};
```

### Approach B: Increase All Timers (Quick Fix, Not Recommended)

Simply increase all delays to 2-3 seconds. This is a band-aid and doesn't fix the race condition.

### Approach C: Remove ProtectedRoute Timers Entirely

Trust only `AuthContext`'s loading state and remove all setTimeout logic from `ProtectedRoute`. Risk: might redirect too quickly on slow networks.

## Recommended Implementation: Approach A

This provides:
- ✅ Single source of truth for OAuth processing
- ✅ Clear coordination between components  
- ✅ No race conditions between timers
- ✅ Better user feedback ("Completing sign in...")
- ✅ Deterministic behavior

## Testing Plan

1. **Magic Link Test:**
   - Sign out completely
   - Request magic link for anders@noddi.no
   - Click link in email
   - Should land on dashboard without redirect loop
   - Check console: should see "OAuth callback detected" → "Auth state changed" → no redirects

2. **Google OAuth Test:**
   - Sign out completely
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Should land on dashboard without redirect loop

3. **Edge Cases:**
   - Test with slow network (throttle to 3G)
   - Test with multiple rapid login attempts
   - Test refresh token flow (wait for token expiry)

## Files Summary

| File | Changes |
|------|---------|
| `src/components/auth/AuthContext.tsx` | Add `isProcessingOAuth` state, update `handleOAuthCallback`, expose via context |
| `src/components/auth/ProtectedRoute.tsx` | Simplify logic, wait for `!isProcessingOAuth`, remove competing timers |
| `src/hooks/useAuth.tsx` | Add `isProcessingOAuth` to return value |
| `src/pages/Auth.tsx` | Already correct, no changes needed |

## Debug Logging to Add

For troubleshooting, add these logs:

```typescript
// In ProtectedRoute
logger.debug('ProtectedRoute state', { 
  loading, 
  isProcessingOAuth, 
  hasUser: !!user,
  pathname: window.location.pathname 
}, 'ProtectedRoute');

// In AuthContext handleOAuthCallback
logger.info('OAuth processing complete', { userId: session?.user?.id }, 'Auth');
```

## Alternative: If This Still Fails

If the above doesn't work, the issue might be:
1. **Supabase redirect URL misconfiguration** - Check dashboard settings
2. **Session storage issue** - localStorage might be blocked/cleared
3. **Browser extension interference** - Test in incognito
4. **RLS policy blocking profile query** - Check if profile fetch fails

Would need to see browser console logs during actual login attempt to diagnose further.

