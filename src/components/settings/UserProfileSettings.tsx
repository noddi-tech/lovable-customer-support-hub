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
import { Loader2, Upload, Trash2, Lock, Building2, Users, Calendar, Shield } from 'lucide-react';
import { format } from 'date-fns';

export const UserProfileSettings = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

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
        </CardContent>
      </Card>
    </div>
  );
};
