

## Fix: Authentication Redirect Loop After Magic Link / Google OAuth

### Root Cause

The authentication succeeds on Supabase's side, but there's a **race condition** between:
1. The `onAuthStateChange` callback setting the user
2. The TanStack Query fetches for profile/memberships starting
3. The ProtectedRoute's 2-second grace period expiring

When `loading` is computed as `loading || profileLoading || membershipsLoading`, the profile queries may still be loading when the grace period ends, causing a premature redirect.

---

## Solution: Separate Initial Load from Ongoing Fetches

### Part 1: Update `useAuth.tsx` - Fix Loading State Logic

**File:** `src/hooks/useAuth.tsx`

The `loading` state should only reflect the **initial auth check**, not ongoing query refetches:

```typescript
// Current (problematic)
loading: loading || profileLoading || membershipsLoading

// Fixed - Only use auth loading for route protection
// Profile/membership loading should not block route rendering
loading: loading, // Just the auth context loading state

// Add separate property for data loading
isDataLoading: profileLoading || membershipsLoading,
```

**Full change:**

```typescript
return {
  user,
  session,
  profile,
  // CRITICAL: Only auth loading blocks route rendering
  loading: loading,
  // Separate flag for when additional data is still loading
  isDataLoading: profileLoading || membershipsLoading,
  signOut: handleSignOut,
  // ... rest of properties
};
```

---

### Part 2: Update `ProtectedRoute.tsx` - Handle Initial Auth Better

**File:** `src/components/auth/ProtectedRoute.tsx`

Improve the logic to wait for the actual auth state, not a timer:

```typescript
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const hasAttemptedAuth = useRef(false);

  useEffect(() => {
    // Once loading is complete, we know the auth state
    if (!loading) {
      hasAttemptedAuth.current = true;
      
      if (!user) {
        // Small delay to handle OAuth callback timing
        const timer = setTimeout(() => {
          if (!user) {
            navigate('/auth', { replace: true });
          }
        }, 500);
        return () => clearTimeout(timer);
      } else {
        setIsReady(true);
      }
    }
  }, [user, loading, navigate]);

  // Also check: if user arrives with a hash fragment (OAuth callback), wait longer
  useEffect(() => {
    if (window.location.hash.includes('access_token')) {
      // OAuth callback detected - give extra time for token exchange
      const timer = setTimeout(() => setIsReady(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (loading || (!isReady && !hasAttemptedAuth.current)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
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

---

### Part 3: Update `AuthContext.tsx` - Better Token Handling

**File:** `src/components/auth/AuthContext.tsx`

Add explicit handling for OAuth callback tokens in the URL hash:

```typescript
useEffect(() => {
  let mounted = true;

  // Handle OAuth callback with hash fragments
  const handleOAuthCallback = async () => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      logger.info('OAuth callback detected, processing tokens', undefined, 'Auth');
      
      // Supabase client automatically handles the hash
      // Wait for it to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh session to ensure we have the latest
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted && session) {
        setSession(session);
        setUser(session.user);
        
        // Clean up hash from URL
        window.history.replaceState(null, '', window.location.pathname);
      }
      setLoading(false);
      return true;
    }
    return false;
  };

  // Set up auth state listener FIRST
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (!mounted) return;
      
      logger.info('Auth state changed', { event, hasSession: !!session }, 'Auth');
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // ... rest of existing logic
    }
  );

  // Check for OAuth callback FIRST, then get session
  handleOAuthCallback().then(async (wasCallback) => {
    if (!wasCallback && mounted) {
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    }
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);
```

---

### Part 4: Update `Auth.tsx` - Handle Return from OAuth

**File:** `src/pages/Auth.tsx`

Add detection for valid session on mount (handles returning from OAuth):

```typescript
// Near line 90, update the useEffect that checks for logged in user:
useEffect(() => {
  // If there's a hash with tokens, wait for processing before checking
  if (window.location.hash.includes('access_token')) {
    // OAuth callback - don't redirect yet, let AuthContext process
    return;
  }
  
  // Redirect if already logged in (but not in recovery mode)
  if (user && !isRecoveryMode) {
    navigate('/', { replace: true });
  }
}, [user, navigate, isRecoveryMode]);
```

---

## Files Summary

| File | Changes |
|------|---------|
| `src/hooks/useAuth.tsx` | Separate auth loading from data loading |
| `src/components/auth/ProtectedRoute.tsx` | Improve timing logic, handle OAuth callbacks |
| `src/components/auth/AuthContext.tsx` | Add explicit OAuth callback handling |
| `src/pages/Auth.tsx` | Don't interfere during OAuth callback processing |

---

## Expected Behavior After Fix

1. User clicks magic link or signs in with Google
2. Supabase redirects back to app with tokens in URL hash
3. `AuthContext` detects OAuth callback, processes tokens
4. User is set, loading becomes false
5. `ProtectedRoute` sees valid user, renders protected content
6. URL hash is cleaned up
7. User lands on dashboard

---

## Testing Steps

1. Sign out completely
2. Go to `/auth`
3. Choose "Magic Link" tab
4. Enter anders@noddi.no
5. Click "Send Magic Link"
6. Check email, click the magic link
7. Verify user lands on dashboard (not redirected back to /auth)
8. Repeat with Google OAuth

