import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        <div className="text-center">Loading...</div>
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
          <Tabs defaultValue="general" className="space-y-8">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-1 bg-card/50 backdrop-blur-sm border border-border/50 shadow-surface">
              <TabsTrigger value="departments" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                {t('settings.tabs.departments')}
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                {t('settings.tabs.general')}
              </TabsTrigger>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('settings.tabs.profile')}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {t('settings.tabs.notifications')}
              </TabsTrigger>
              <TabsTrigger value="email-templates" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                {t('settings.tabs.emailDesign')}
              </TabsTrigger>
              <TabsTrigger value="users" disabled={!canManageUsers} className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('settings.tabs.users')}
              </TabsTrigger>
              <TabsTrigger value="admin" disabled={!canManageSettings} className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('settings.tabs.admin')}
              </TabsTrigger>
            </TabsList>



            {/* Departments Management */}
            <TabsContent value="departments" className="space-y-6">
              <DepartmentManagement />
            </TabsContent>

            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <LanguageSettings />
              <Card className="bg-gradient-surface border-border/50 shadow-surface">
                <CardHeader>
                  <CardTitle className="text-primary">General Settings</CardTitle>
                  <CardDescription>
                    Basic account and preference settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Additional general settings will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card className="bg-gradient-surface border-border/50 shadow-surface">
                <CardHeader>
                  <CardTitle className="text-primary">Profile Settings</CardTitle>
                  <CardDescription>
                    Manage your profile information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Profile settings will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card className="bg-gradient-surface border-border/50 shadow-surface">
                <CardHeader>
                  <CardTitle className="text-primary">Notification Settings</CardTitle>
                  <CardDescription>
                    Configure your notification preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Notification settings will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Template Settings */}
            <TabsContent value="email-templates" className="space-y-6">
              <EmailTemplateSettings />
            </TabsContent>

            {/* Users Management */}
            <TabsContent value="users" className="space-y-6">
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
            </TabsContent>

            {/* Admin Portal */}
            <TabsContent value="admin" className="space-y-6">
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}