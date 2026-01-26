import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, Trash2, Lock, Building2, Users, Calendar, Shield, Check } from 'lucide-react';
import { format } from 'date-fns';

export const UserProfileSettings = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  // Check if Google is already linked
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === 'google'
  );
  const hasGoogleLinked = !!googleIdentity;

  const { uploadAvatar, removeAvatar, isUploading, progress } = useAvatarUpload({
    userId: user?.id || '',
  });

  // Fetch organization details
  const { data: organization } = useQuery({
    queryKey: ['user-organization', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('name, created_at')
        .eq('id', profile.organization_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Fetch department details
  const { data: department } = useQuery({
    queryKey: ['user-department', profile?.department_id],
    queryFn: async () => {
      if (!profile?.department_id) return null;
      const { data, error } = await supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.department_id,
  });

  // Update when profile changes
  useState(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('user_id', user.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset email sent. Check your inbox.');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to send password reset email');
    }
  };

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/settings`,
        }
      });

      if (error) {
        if (error.message.includes('already linked')) {
          toast.error('This Google account is already linked to another user');
        } else {
          toast.error(error.message || 'Failed to link Google account');
        }
        return;
      }
      // User will be redirected to Google for OAuth
    } catch (error) {
      console.error('Link Google error:', error);
      toast.error('Failed to link Google account');
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRole = (role: string) => {
    return role
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile.avatar', 'Profile Photo')}</CardTitle>
          <CardDescription>
            {t('settings.profile.avatarDescription', 'Upload a photo to personalize your account')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {getInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading... {progress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('settings.profile.uploadPhoto', 'Upload Photo')}
                  </>
                )}
              </Button>
              {profile.avatar_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAvatar}
                  disabled={isUploading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('settings.profile.removePhoto', 'Remove Photo')}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {t('settings.profile.photoHint', 'JPG, PNG or WebP. Max 2MB.')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile.personalInfo', 'Personal Information')}</CardTitle>
          <CardDescription>
            {t('settings.profile.personalInfoDescription', 'Update your personal details')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('settings.profile.fullName', 'Full Name')}</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('settings.profile.email', 'Email Address')}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.profile.emailHint', 'Email cannot be changed. Contact support if needed.')}
            </p>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={isSaving || fullName === profile.full_name}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              t('settings.profile.saveChanges', 'Save Changes')
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Organization & Role */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile.organizationRole', 'Organization & Role')}</CardTitle>
          <CardDescription>
            {t('settings.profile.organizationRoleDescription', 'Your organization membership details')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.profile.organization', 'Organization')}
                </p>
                <p className="font-medium">{organization?.name || 'Not assigned'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.profile.department', 'Department')}
                </p>
                <p className="font-medium">{department?.name || 'Not assigned'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.profile.role', 'Role')}
                </p>
                <Badge variant="secondary" className="mt-1">
                  {formatRole(profile.role)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.profile.memberSince', 'Member Since')}
                </p>
                <p className="font-medium">
                  {profile.created_at
                    ? format(new Date(profile.created_at), 'MMMM yyyy')
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile.security', 'Security')}</CardTitle>
          <CardDescription>
            {t('settings.profile.securityDescription', 'Manage your account security settings')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">{t('settings.profile.password', 'Password')}</p>
              <p className="text-sm text-muted-foreground">
                {t('settings.profile.passwordHint', 'Send a password reset link to your email')}
              </p>
            </div>
            <Button variant="outline" onClick={handleChangePassword}>
              {t('settings.profile.changePassword', 'Change Password')}
            </Button>
          </div>

          {/* Google Account Linking */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <div>
                <p className="font-medium">
                  {t('settings.profile.googleAccount', 'Google Account')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {hasGoogleLinked 
                    ? t('settings.profile.googleLinked', 'Connected - you can sign in with Google')
                    : t('settings.profile.googleNotLinked', 'Link your Google account for faster sign-in')}
                </p>
              </div>
            </div>
            {hasGoogleLinked ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                <Check className="h-3 w-3 mr-1" />
                {t('settings.profile.connected', 'Connected')}
              </Badge>
            ) : (
              <Button 
                variant="outline" 
                onClick={handleLinkGoogle}
                disabled={isLinkingGoogle}
              >
                {isLinkingGoogle ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  t('settings.profile.linkGoogle', 'Link Google')
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
