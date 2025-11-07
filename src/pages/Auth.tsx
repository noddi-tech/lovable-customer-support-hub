import React, { useState, useEffect } from 'react';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, AlertCircle, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

// Validation schemas for authentication inputs
const emailSchema = z.string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(100, { message: "Password must be less than 100 characters" });

const fullNameSchema = z.string()
  .trim()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(100, { message: "Name must be less than 100 characters" });

export const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteOrganization, setInviteOrganization] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [authMethod, setAuthMethod] = useState<'google' | 'email' | 'magic'>('google');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Check if this is password recovery mode
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get('type') === 'recovery') {
      setIsRecoveryMode(true);
    }
  }, []);

  // Check for invite token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('invite');
    
    if (token) {
      setInviteToken(token);
      
      // Fetch organization name from invite token
      const fetchInviteOrganization = async () => {
        try {
          const { data, error } = await supabase
            .from('organization_memberships')
            .select('organizations(name)')
            .eq('invite_token', token)
            .eq('status', 'pending')
            .gt('invite_expires_at', new Date().toISOString())
            .single();

          if (!error && data) {
            setInviteOrganization(data.organizations?.name || null);
          }
        } catch (err) {
          console.error('Error fetching invite organization:', err);
        }
      };

      fetchInviteOrganization();
    }
  }, []);

  useEffect(() => {
    // Redirect if already logged in (but not in recovery mode)
    if (user && !isRecoveryMode) {
      navigate('/', { replace: true });
    }
  }, [user, navigate, isRecoveryMode]);

  const handleDevLogin = async () => {
    setDevLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const { data, error } = await supabase.functions.invoke('dev-login', {
        body: { 
          email: 'joachim@noddi.no',
          redirectTo: window.location.origin + '/'
        }
      });

      if (error) throw error;

      if (data?.magicLink) {
        setSuccessMessage('Dev login link generated! Redirecting...');
        window.location.href = data.magicLink;
      } else {
        throw new Error('No magic link received');
      }
    } catch (error: any) {
      console.error('Dev login error:', error);
      setError(error.message || 'Failed to generate dev login');
    } finally {
      setDevLoading(false);
    }
  };

  const cleanupAuthState = () => {
    localStorage.removeItem('supabase.auth.token');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        setError(emailValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        setError(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValidation.data,
        password: passwordValidation.data,
      });
      
      if (error) throw error;
      
      if (data.user) {
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
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
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Google OAuth error:', error);
        }
        throw error;
      }
      
      if (import.meta.env.DEV) {
        console.log('Google OAuth initiated:', data);
      }
    } catch (error: any) {
      console.error('Google sign in error:', error);
      setError(error.message || 'An error occurred during Google sign in. Please ensure Google OAuth is configured in Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      if (!email) {
        setLoading(false);
        setError('Please enter your email to reset your password.');
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth#type=recovery`,
      });
      if (error) throw error;
      setSuccessMessage('Password reset link has been sent to your email.');
      setTimeout(() => setShowForgotPassword(false), 2000);
    } catch (err: any) {
      setError(err.message || 'Unable to send password reset email');
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

      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

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

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      if (!email) {
        setError('Please enter your email address.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      
      if (error) throw error;
      
      setSuccessMessage('Magic link sent! Check your email to sign in.');
    } catch (error: any) {
      setError(error.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const nameValidation = fullNameSchema.safeParse(fullName);
      if (!nameValidation.success) {
        setError(nameValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const emailValidation = emailSchema.safeParse(email);
      if (!emailValidation.success) {
        setError(emailValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        setError(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signUp({
        email: emailValidation.data,
        password: passwordValidation.data,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: nameValidation.data,
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
          return;
        }
        throw error;
      }
      
      if (data.user) {
        if (data.user.email_confirmed_at) {
          navigate('/', { replace: true });
        } else {
          setSuccessMessage('Account created! Please check your email for the confirmation link.');
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  const inviteBanner = inviteToken && inviteOrganization && (
    <Alert className="mb-3 border-primary/50 bg-primary/10">
      <UserPlus className="h-4 w-4 text-primary" />
      <AlertTitle className="font-semibold text-sm">You've been invited!</AlertTitle>
      <AlertDescription className="text-xs">
        Join <strong>{inviteOrganization}</strong> by signing up below.
      </AlertDescription>
    </Alert>
  );

  // Password reset view
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        
        <Card className="w-full max-w-sm relative z-10 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm max-h-[90vh] flex flex-col">
          <CardHeader className="space-y-3 text-center pb-4 shrink-0">
            <div className="mx-auto w-16 h-16 mb-1">
              <img 
                src="/images/logo-support-hub.png" 
                alt="Support Hub Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
            <CardDescription className="text-sm">
              Enter your new password below
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 overflow-y-auto">
            {inviteBanner}
            
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
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
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
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
                    minLength={6}
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

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main auth view
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-background via-background to-muted">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <Card className="w-full max-w-sm relative z-10 shadow-2xl border-border/50 bg-card/95 backdrop-blur-sm max-h-[90vh] flex flex-col">
        <CardHeader className="space-y-3 text-center pb-4 shrink-0">
          <div className="mx-auto w-16 h-16 mb-1">
            <img 
              src="/images/logo-support-hub.png" 
              alt="Support Hub Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isRecoveryMode ? 'Reset Your Password' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-sm">
            {isRecoveryMode 
              ? 'Enter your new password below' 
              : 'Sign in to access your support hub'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 overflow-y-auto px-6 pb-6">
          {inviteBanner}
          
          <Tabs value={authMethod} onValueChange={(value) => setAuthMethod(value as 'google' | 'email' | 'magic')} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3 h-9">
              <TabsTrigger value="google" className="text-xs">Quick</TabsTrigger>
              <TabsTrigger value="email" className="text-xs">Email</TabsTrigger>
              <TabsTrigger value="magic" className="text-xs">Magic Link</TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="space-y-3 mt-3">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">Sign in quickly with your Google account</p>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
              
              {mode === 'signin' && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-center text-muted-foreground mb-2">Or use other methods</p>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setAuthMethod('email')}
                    >
                      Sign in with Email/Password
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setAuthMethod('magic')}
                    >
                      Sign in with Magic Link
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="email" className="space-y-3 mt-3">
              <Tabs value={mode} onValueChange={(value) => setMode(value as 'signin' | 'signup')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-3 h-9">
                  <TabsTrigger value="signin" className="text-xs">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-3">
                  <form onSubmit={handleSignIn} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-9 bg-background"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-sm">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 h-9 bg-background"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full h-9" disabled={loading}>
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setShowForgotPassword(true)}
                    disabled={loading}
                  >
                    Forgot your password?
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="space-y-3">
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pl-10 h-9 bg-background"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 h-9 bg-background"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 h-9 bg-background"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="py-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{error}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full h-9" disabled={loading}>
                      {loading ? 'Creating account...' : 'Sign Up'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="magic" className="space-y-3 mt-3">
              <div className="text-center space-y-2 mb-3">
                <p className="text-sm text-muted-foreground">Enter your email to receive a magic sign-in link</p>
              </div>
              
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="magic-email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-9 bg-background"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
                
                {successMessage && (
                  <Alert className="py-2 border-primary/50 bg-primary/10">
                    <AlertDescription className="text-xs">{successMessage}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full h-9" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Forgot Password Dialog */}
          <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Enter your email address and we'll send you a link to reset your password.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-background"
                      required
                    />
                  </div>
                </div>
                {successMessage && (
                  <Alert>
                    <AlertDescription className="text-sm">{successMessage}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {import.meta.env.DEV && (
            <div className="mt-3 pt-3 border-t">
              <Button
                onClick={handleDevLogin}
                variant="outline"
                size="sm"
                className="w-full"
                disabled={loading}
              >
                Dev Login (admin@supporttrek.com)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
