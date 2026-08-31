import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { signInWithNavio } from '@navio/nidp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertCircle } from 'lucide-react';
import { isPasswordLoginEnabled } from '@/lib/auth-features';
import { logger } from '@/utils/logger';
import {
  disablePreviewBypass,
  enablePreviewBypass,
  getDevLoginCredentials,
  isDevPreview,
} from '@/lib/dev-preview-auth';

// Error keys that may arrive as `?error=` when a sign-in bounces back to /auth.
// `not_authenticated` is intentionally omitted — landing on the login page
// already makes it obvious that signing in is required.
const ERROR_MESSAGES: Record<string, { title: string; body: string; fix?: string }> = {
  oauth: {
    title: 'Sign-in failed at the identity provider',
    body: 'The IdP returned an error during the OAuth callback.',
    fix: 'Open DevTools → Console and look for [auth] OIDC callback error.',
  },
  duplicate_email: {
    title: 'Multiple accounts with the same email',
    body:
      'Navio sign-in succeeded, but Supabase Auth found more than one auth.users row with your email in ' +
      'the "default" linking domain, so it cannot link the Navio identity to a single account.',
    fix:
      'Keep one auth.users row per email (the one with a profile/roles) and merge the rest — see ' +
      'docs/sso/navio-auth-setup.md. Workaround: Sign in with Google if that identity already exists.',
  },
  no_profile: {
    title: 'Signed in, but no app access',
    body: 'Your identity was accepted, but there is no profile row for your user yet.',
    fix: 'See browser console [auth] for user id + SQL. Provision migration may be missing (PGRST202).',
  },
  no_supporthub_role: {
    title: 'No Support Hub access',
    body:
      'Your Navio account is valid, but the token does not include supporthub.access ' +
      '(or roles/superuser).',
    fix:
      'Ask a Navio administrator to grant roles/supporthub.user (or roles/supporthub.admin) ' +
      'on your personal UserGroup, or set is_superuser and sign out/in.',
  },
  account_disabled: {
    title: 'Account disabled',
    body: 'Your profile is deactivated. Contact an administrator if this is wrong.',
  },
};

export const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const passwordLoginEnabled = isPasswordLoginEnabled();

  // Post-login return target (e.g. an OAuth consent screen). Same-origin only.
  const nextPath = (() => {
    const raw = new URLSearchParams(window.location.search).get('next');
    if (!raw) return null;
    if (!raw.startsWith('/') || raw.startsWith('//')) return null;
    return raw;
  })();

  const authRedirectTo = `${window.location.origin}/auth${
    nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''
  }`;

  const errorKey = new URLSearchParams(window.location.search).get('error');
  const errorDetail = errorKey ? ERROR_MESSAGES[errorKey] : undefined;

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecoveryMode(true);
    }
  }, []);

  // Re-surface a duplicate-account fix path in the console after redirect.
  useEffect(() => {
    if (errorKey !== 'duplicate_email') return;
    console.groupCollapsed('[auth] login page: error=duplicate_email');
    console.info(ERROR_MESSAGES.duplicate_email);
    console.info(
      'Diagnose (SQL editor): select * from public.admin_list_duplicate_auth_emails();\n' +
        'Merge via admin-cleanup-users edge fn: POST {"action":"merge","from":"<dup>","to":"<canonical>"}\n' +
        'See docs/sso/navio-auth-setup.md → Duplicate accounts.'
    );
    console.groupEnd();
  }, [errorKey]);

  useEffect(() => {
    if (window.location.hash.includes('access_token')) return; // let AuthContext process
    if (user && !isRecoveryMode) {
      navigate(nextPath || '/', { replace: true });
    }
  }, [user, navigate, isRecoveryMode, nextPath]);

  const cleanupAuthState = () => {
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  // Kick off an OAuth redirect. We drive the browser navigation ourselves
  // (skipBrowserRedirect) so failures surface as an error alert instead of a
  // silent no-op (the SDK's implicit redirect swallows errors).
  const startOAuth = async (
    provider: Parameters<typeof supabase.auth.signInWithOAuth>[0]['provider'],
    label: string,
    extraOptions?: Parameters<typeof supabase.auth.signInWithOAuth>[0]['options']
  ) => {
    setLoading(true);
    setError('');
    logger.info(`Initiating ${label} OAuth`, { redirectTo: authRedirectTo, provider }, 'Auth');
    try {
      cleanupAuthState();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: authRedirectTo, skipBrowserRedirect: true, ...extraOptions },
      });
      if (error) throw error;
      if (!data?.url) {
        throw new Error(
          `Could not start ${label} sign-in (no redirect URL). Ensure the provider is configured in Supabase.`
        );
      }
      window.location.assign(data.url);
    } catch (err: any) {
      logger.error(`${label} sign in failed`, { error: err?.message }, 'Auth');
      setError(err?.message || `An error occurred during ${label} sign in.`);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () =>
    startOAuth('google', 'Google', {
      queryParams: { access_type: 'offline', prompt: 'consent' },
    });

  // "Sign in with Navio" — product IdP (auth.noddi.co/o) via @navio/nidp.
  // Data scope comes from navio SO/SD membership claims. See docs/sso/navio-auth-setup.md.
  const handleNavioSignIn = async () => {
    setLoading(true);
    setError('');
    logger.info('Initiating Navio OAuth', { redirectTo: authRedirectTo }, 'Auth');
    try {
      cleanupAuthState();
      const { data, error } = await signInWithNavio(supabase, authRedirectTo, {
        skipBrowserRedirect: true,
      });
      if (error) throw error;
      if (!data?.url) {
        throw new Error(
          'Could not start Navio sign-in (no redirect URL). Ensure custom:navio is configured in Supabase.'
        );
      }
      window.location.assign(data.url);
    } catch (err: any) {
      logger.error('Navio sign in failed', { error: err?.message }, 'Auth');
      setError(err?.message || 'An error occurred during Navio sign in.');
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      cleanupAuthState();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) navigate(nextPath || '/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  // Dev-only: sign in as the configured admin test user with a REAL session.
  const handleDevSignIn = async () => {
    const creds = getDevLoginCredentials();
    if (!creds) return;
    setLoading(true);
    setError('');
    try {
      cleanupAuthState();
      disablePreviewBypass();
      const { error } = await supabase.auth.signInWithPassword(creds);
      if (error) throw error;
      navigate(nextPath || '/', { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Dev sign-in failed. Check VITE_DEV_LOGIN_* in .env.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (!password || !confirmPassword) {
        setError('Please fill in both password fields.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMessage('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pageShell = (children: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <Card className="w-full max-w-sm relative z-10 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm">
        {children}
      </Card>
    </div>
  );

  // Password recovery view (only reachable via a recovery link).
  if (isRecoveryMode) {
    return pageShell(
      <>
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-16 h-16">
            <img src="/images/logo-support-hub.png" alt="Support Hub" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-background"
                  required
                  minLength={8}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 bg-background"
                  required
                  minLength={8}
                />
              </div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="border-primary/50 bg-primary/10">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating password…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </>
    );
  }

  // Main sign-in view — Navio + Google only.
  return pageShell(
    <>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Support Hub</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorDetail && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{errorDetail.title}</AlertTitle>
            <AlertDescription className="space-y-2">
              <p className="text-xs">{errorDetail.body}</p>
              {errorDetail.fix && (
                <p className="text-xs opacity-90">
                  <span className="font-medium">Fix: </span>
                  {errorDetail.fix}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button
          variant="default"
          size="lg"
          className="w-full"
          onClick={handleNavioSignIn}
          disabled={loading}
        >
          <span className="mr-2 text-base font-semibold">N</span>
          {loading ? 'Redirecting…' : 'Sign in with Navio'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </Button>

        {isDevPreview() && (
          <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Dev sign-in (real session, dev build only)
            </p>
            <Input
              type="email"
              value={devEmail}
              onChange={(e) => setDevEmail(e.target.value)}
              placeholder="user@noddi.no"
              className="h-8 text-xs"
              autoComplete="off"
            />
            <Input
              type="password"
              value={devPassword}
              onChange={(e) => setDevPassword(e.target.value)}
              placeholder="password (remembered in this browser)"
              className="h-8 text-xs"
              autoComplete="off"
            />
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={handleDevSignIn}
                disabled={loading || !devEmail || !devPassword}
              >
                Sign in as {devEmail || 'test user'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  forgetDevLogin();
                  setDevPassword('');
                }}
              >
                Forget
              </Button>
            </div>
          </div>
        )}


        {isDevPreview() && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => {
              enablePreviewBypass();
              navigate(nextPath || '/', { replace: true });
            }}
          >
            Skip sign-in (dev preview)
          </Button>
        )}

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}


        {passwordLoginEnabled && (
          <>
            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
            <form onSubmit={handlePasswordSignIn} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </>
  );
};
