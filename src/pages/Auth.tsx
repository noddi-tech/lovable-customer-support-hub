import React, { useState, useEffect } from 'react';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Lock, User, AlertCircle, UserPlus } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { useTranslation } from 'react-i18next';

export const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteOrganization, setInviteOrganization] = useState<string | null>(null);
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
    setSuccess('');
    
    try {
      const { data, error } = await supabase.functions.invoke('dev-login', {
        body: { 
          email: 'joachim@noddi.no',
          redirectTo: window.location.origin + '/'
        }
      });

      if (error) throw error;

      if (data?.magicLink) {
        setSuccess('Dev login link generated! Redirecting...');
        // Use window.location.href for magic links (external redirect required)
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
      cleanupAuthState();
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
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
      setSuccess('Password reset link has been sent to your email. Please check your inbox.');
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
    setSuccess('');

    try {
      if (!newPassword || !confirmPassword) {
        setError('Please fill in both password fields.');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess('Password updated successfully! Redirecting to login...');

      // Clear recovery mode and redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/auth';
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setMagicLinkSent(false);
    
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
      
      setMagicLinkSent(true);
      setSuccess('Magic link sent! Check your email to sign in.');
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
    setSuccess('');
    
    try {
      cleanupAuthState();
      
      if (import.meta.env.DEV) {
        console.log('Starting signup process...');
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      
      if (import.meta.env.DEV) {
        console.log('Signup response:', { data, error });
      }
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Signup error:', error);
        }
        // Handle user already registered case
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
          return;
        }
        throw error;
      }
      
      // Check if user was created and is immediately confirmed
      if (data.user) {
        if (import.meta.env.DEV) {
          console.log('User created:', data.user);
          console.log('Email confirmed at:', data.user.email_confirmed_at);
        }
        
        if (data.user.email_confirmed_at) {
          // User is immediately confirmed, redirect to main app
          if (import.meta.env.DEV) {
            console.log('User immediately confirmed, redirecting...');
          }
          navigate('/', { replace: true });
        } else {
          if (import.meta.env.DEV) {
            console.log('User needs email confirmation');
          }
          setSuccess('Account created! Please check your email for the confirmation link.');
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during sign up');
    } finally {
      setLoading(false);
    }
  };

  // Show password reset form if in recovery mode
  if (isRecoveryMode) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-primary-foreground" />
            </div>
            <Heading level={1} className="text-foreground mb-2">Reset Your Password</Heading>
            <p className="text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Set New Password</CardTitle>
              <CardDescription>
                Choose a strong password with at least 6 characters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
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
                      className="pl-10"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mt-4 border-success text-success">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Invite Banner */}
        {inviteToken && inviteOrganization && (
          <Alert className="bg-primary/10 border-primary/20">
            <UserPlus className="h-4 w-4" />
            <AlertTitle>You've been invited!</AlertTitle>
            <AlertDescription>
              You've been invited to join <strong>{inviteOrganization}</strong>. 
              Sign up below to accept your invitation.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <Heading level={1} className="text-foreground mb-2">{t('auth.welcomeTitle')}</Heading>
          <p className="text-muted-foreground">
            {t('auth.welcomeDescription')}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle>{t('auth.welcome')}</CardTitle>
            <CardDescription>
              {t('auth.signInDescription')}
            </CardDescription>
          </CardHeader>
          
          {/* Dev Login Section */}
          <div className="px-6 pb-4">
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                Development Mode
              </p>
              <Button 
                onClick={handleDevLogin}
                disabled={devLoading}
                variant="outline"
                className="w-full"
              >
                {devLoading ? 'Generating login...' : 'Log in as joachim@noddi.no'}
              </Button>
            </div>
          </div>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                {/* Google Sign In */}
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  <FcGoogle className="mr-2 h-4 w-4" />
                  {t('auth.continueWithGoogle')}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('auth.orContinueWithEmail')}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setMagicLinkSent(false);
                        }}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleMagicLink}
                    variant="outline"
                    className="w-full"
                    disabled={loading || magicLinkSent}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {magicLinkSent ? 'Magic Link Sent!' : 'Send Magic Link'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or sign in with password
                      </span>
                    </div>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">{t('auth.password')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder={t('auth.passwordPlaceholder')}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button variant="link" type="button" size="sm" className="px-0" onClick={handleForgotPassword} disabled={loading}>
                        {t('auth.forgotPassword')}
                      </Button>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground"
                      disabled={loading}
                    >
                      {loading ? t('auth.signingIn') : t('auth.signIn')}
                    </Button>
                  </form>
                </div>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                {/* Google Sign In */}
                <Button
                  onClick={handleGoogleSignIn}
                  variant="outline"
                  className="w-full"
                  disabled={loading}
                >
                  <FcGoogle className="mr-2 h-4 w-4" />
                  {t('auth.continueWithGoogle')}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      {t('auth.orCreateAccountWithEmail')}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder={t('auth.fullNamePlaceholder')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder={t('auth.createPasswordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground"
                    disabled={loading}
                  >
                    {loading ? t('auth.creatingAccount') : t('auth.createAccount')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mt-4 border-success text-success">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Demo Notice */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-medium mb-2">{t('auth.demoMode')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('auth.demoModeDescription')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};