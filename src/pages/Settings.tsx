import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, LayoutItem, AdaptiveSection } from '@/components/admin/design/components/layouts';
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
    <ResponsiveContainer className="min-h-screen flex" maxWidth="full">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-card border-r border-border shadow-surface hidden md:flex flex-col">
        <div className="p-6 border-b border-border">
          <Heading level={2} className="text-lg">{t('settings.title')}</Heading>
          <p className="text-muted-foreground text-sm mt-1">{t('settings.description')}</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ResponsiveTabs 
            defaultValue="general" 
            variant="pills" 
            size="sm" 
            orientation="vertical"
            className="w-full"
          >
            <ResponsiveTabsList className="flex-col bg-transparent gap-1 w-full">
              <ResponsiveTabsTrigger value="general" className="w-full justify-start text-left">
                <SettingsIcon className="w-4 h-4 mr-2" />
                {t('settings.tabs.general')}
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="profile" className="w-full justify-start text-left">
                <User className="w-4 h-4 mr-2" />
                {t('settings.tabs.profile')}
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="notifications" className="w-full justify-start text-left">
                <Bell className="w-4 h-4 mr-2" />
                {t('settings.tabs.notifications')}
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="email-templates" className="w-full justify-start text-left">
                <Palette className="w-4 h-4 mr-2" />
                {t('settings.tabs.emailDesign')}
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="departments" className="w-full justify-start text-left">
                <Building className="w-4 h-4 mr-2" />
                {t('settings.tabs.departments')}
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="users" disabled={!canManageUsers} className="w-full justify-start text-left">
                <User className="w-4 h-4 mr-2" />
                {t('settings.tabs.users')}
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="admin" disabled={!canManageSettings} className="w-full justify-start text-left">
                <Shield className="w-4 h-4 mr-2" />
                {t('settings.tabs.admin')}
              </ResponsiveTabsTrigger>
            </ResponsiveTabsList>
          </ResponsiveTabs>
        </nav>
        
        <div className="p-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="w-full"
          >
            {t('settings.backToDashboard')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Heading level={1}>{t('settings.title')}</Heading>
                <p className="text-muted-foreground text-sm mt-1">{t('settings.description')}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                size="sm"
              >
                {t('settings.backToDashboard')}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden border-b border-border bg-card/50">
          <ResponsiveTabs 
            defaultValue="general" 
            variant="default" 
            size="sm" 
            equalWidth 
            scrollable
          >
            <ResponsiveTabsList className="bg-transparent border-none">
              <ResponsiveTabsTrigger value="general">
                <SettingsIcon className="w-4 h-4" />
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="profile">
                <User className="w-4 h-4" />
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="notifications">
                <Bell className="w-4 h-4" />
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="email-templates">
                <Palette className="w-4 h-4" />
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="departments">
                <Building className="w-4 h-4" />
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="users" disabled={!canManageUsers}>
                <User className="w-4 h-4" />
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="admin" disabled={!canManageSettings}>
                <Shield className="w-4 h-4" />
              </ResponsiveTabsTrigger>
            </ResponsiveTabsList>
          </ResponsiveTabs>
        </div>

        {/* Content Area */}
        <ResponsiveContainer 
          className="flex-1 overflow-y-auto" 
          padding={{ sm: '4', md: '6' }}
          maxWidth="full"
        >
          <ResponsiveTabs 
            defaultValue="general" 
            variant="borderless" 
            className="h-full"
          >

            {/* General Settings */}
            <ResponsiveTabsContent value="general">
              <AdaptiveSection spacing="6" className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
                  <LayoutItem>
                    <LanguageSettings />
                  </LayoutItem>
                  <LayoutItem>
                    <TimezoneSettings />
                  </LayoutItem>
                  <LayoutItem className="lg:col-span-2">
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
                  </LayoutItem>
                </ResponsiveGrid>
              </AdaptiveSection>
            </ResponsiveTabsContent>

            {/* Profile Settings */}
            <ResponsiveTabsContent value="profile">
              <AdaptiveSection spacing="6" className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="6">
                  <LayoutItem>
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
                  </LayoutItem>
                </ResponsiveGrid>
              </AdaptiveSection>
            </ResponsiveTabsContent>

            {/* Notification Settings */}
            <ResponsiveTabsContent value="notifications">
              <AdaptiveSection spacing="6" className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <ResponsiveGrid cols={{ sm: '1', md: '2' }} gap="6">
                  <LayoutItem>
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
                  </LayoutItem>
                </ResponsiveGrid>
              </AdaptiveSection>
            </ResponsiveTabsContent>

            {/* Email Template Settings */}
            <ResponsiveTabsContent value="email-templates">
              <AdaptiveSection spacing="6" className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <EmailTemplateSettings />
              </AdaptiveSection>
            </ResponsiveTabsContent>

            {/* Departments Management */}
            <ResponsiveTabsContent value="departments">
              <AdaptiveSection spacing="6" className="max-h-[calc(100vh-200px)] overflow-y-auto">
                <DepartmentManagement />
              </AdaptiveSection>
            </ResponsiveTabsContent>

            {/* Users Management */}
            <ResponsiveTabsContent value="users">
              <AdaptiveSection spacing="6" className="max-h-[calc(100vh-200px)] overflow-y-auto">
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
              </AdaptiveSection>
            </ResponsiveTabsContent>

            {/* Admin Portal */}
            <ResponsiveTabsContent value="admin">
              <AdaptiveSection spacing="6" className="max-h-[calc(100vh-200px)] overflow-y-auto">
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
              </AdaptiveSection>
            </ResponsiveTabsContent>
          </ResponsiveTabs>
        </ResponsiveContainer>
      </main>
    </ResponsiveContainer>
  );
}