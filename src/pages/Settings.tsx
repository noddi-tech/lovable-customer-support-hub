import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from '@/components/admin/design/components/layouts';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

import { AdminPortal } from '@/components/admin/AdminPortal';
import { UserManagement } from '@/components/admin/UserManagement';

import { DepartmentManagement } from '@/components/admin/DepartmentManagement';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Settings as SettingsIcon, User, Bell, MessageSquare, Camera, Palette, Building } from 'lucide-react';
import { EmailTemplateSettings } from '@/components/settings/EmailTemplateSettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { TimezoneSettings } from '@/components/settings/TimezoneSettings';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { loading } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const canManageUsers = hasPermission('manage_users');
  const canManageSettings = hasPermission('manage_settings');

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-between">
            <div>
              <Heading level={1}>{t('settings.title')}</Heading>
              <p className="text-muted-foreground mt-1">{t('settings.description')}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {t('settings.backToDashboard')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl mx-auto">
            <ResponsiveTabs 
              defaultValue="general" 
              variant="default" 
              size="md" 
              equalWidth 
              className="space-y-8"
            >
              <ResponsiveTabsList className="bg-card/50 backdrop-blur-sm border border-border/50 shadow-surface">
                <ResponsiveTabsTrigger value="departments" className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  {t('settings.tabs.departments')}
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="general" className="flex items-center gap-2">
                  <SettingsIcon className="w-4 h-4" />
                  {t('settings.tabs.general')}
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('settings.tabs.profile')}
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="notifications" className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  {t('settings.tabs.notifications')}
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="email-templates" className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  {t('settings.tabs.emailDesign')}
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="users" disabled={!canManageUsers} className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('settings.tabs.users')}
                </ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="admin" disabled={!canManageSettings} className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {t('settings.tabs.admin')}
                </ResponsiveTabsTrigger>
              </ResponsiveTabsList>

              {/* Departments Management */}
              <ResponsiveTabsContent value="departments" className="space-y-6">
                <DepartmentManagement />
              </ResponsiveTabsContent>

              {/* General Settings */}
              <ResponsiveTabsContent value="general" className="space-y-6">
                      <LanguageSettings />
                      <TimezoneSettings />
                      {/* Uncomment to test timezone functionality:
                      <TimezoneTest className="mt-4" />
                      */}
                <Card className="bg-gradient-surface border-border/50 shadow-surface">
                  <CardHeader>
                    <CardTitle className="text-primary">{t('common.settings')}</CardTitle>
                    <CardDescription>
                      {t('settings.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.description')}
                    </p>
                  </CardContent>
                </Card>
              </ResponsiveTabsContent>

              {/* Profile Settings */}
              <ResponsiveTabsContent value="profile" className="space-y-6">
                <Card className="bg-gradient-surface border-border/50 shadow-surface">
                  <CardHeader>
                    <CardTitle className="text-primary">{t('settings.tabs.profile')}</CardTitle>
                    <CardDescription>
                      {t('settings.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.description')}
                    </p>
                  </CardContent>
                </Card>
              </ResponsiveTabsContent>

              {/* Notification Settings */}
              <ResponsiveTabsContent value="notifications" className="space-y-6">
                <Card className="bg-gradient-surface border-border/50 shadow-surface">
                  <CardHeader>
                    <CardTitle className="text-primary">{t('settings.tabs.notifications')}</CardTitle>
                    <CardDescription>
                      {t('settings.description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.description')}
                    </p>
                  </CardContent>
                </Card>
              </ResponsiveTabsContent>

              {/* Email Template Settings */}
              <ResponsiveTabsContent value="email-templates" className="space-y-6">
                <EmailTemplateSettings />
              </ResponsiveTabsContent>

              {/* Users Management */}
              <ResponsiveTabsContent value="users" className="space-y-6">
                {canManageUsers ? (
                  <UserManagement />
                ) : (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      {t('settings.permissions.denied')}
                    </AlertDescription>
                  </Alert>
                )}
              </ResponsiveTabsContent>

              {/* Admin Portal */}
              <ResponsiveTabsContent value="admin" className="space-y-6">
                {canManageSettings ? (
                  <AdminPortal />
                ) : (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      {t('settings.permissions.denied')}
                    </AlertDescription>
                  </Alert>
                )}
              </ResponsiveTabsContent>
            </ResponsiveTabs>
        </div>
      </div>
    </div>
  );
}