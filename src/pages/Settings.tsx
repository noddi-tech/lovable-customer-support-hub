import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, LayoutItem, AdaptiveSection } from '@/components/admin/design/components/layouts';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Settings as SettingsIcon, User, Bell, MessageSquare, Camera, Palette, Building } from 'lucide-react';

import { AdminPortal } from '@/components/admin/AdminPortal';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';
import { UserManagement } from '@/components/admin/UserManagement';
import { DepartmentManagement } from '@/components/admin/DepartmentManagement';
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
  const [searchParams] = useSearchParams();
  
  const canManageUsers = hasPermission('manage_users');
  const canManageSettings = hasPermission('manage_settings');
  const activeTab = searchParams.get('tab') || 'general';

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  // Check if we're in admin mode
  const isAdminMode = ['users', 'inboxes', 'integrations', 'voice', 'design', 'admin'].includes(activeTab);

  if (isAdminMode) {
    return (
      <AdminPortalLayout>
        <AdminPortal />
      </AdminPortalLayout>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
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
        );

      case 'profile':
        return (
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
        );

      case 'notifications':
        return (
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
        );

      case 'email-templates':
        return <EmailTemplateSettings />;

      case 'departments':
        return <DepartmentManagement />;

      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Select a tab to view settings</p>
          </div>
        );
    }
  };

  return (
    <ResponsiveContainer className="min-h-screen flex" maxWidth="full">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border shadow-surface hidden md:flex flex-col">
        <div className="p-6 border-b border-sidebar-border bg-sidebar">
          <Heading level={2} className="text-lg text-sidebar-foreground">{t('settings.title')}</Heading>
          <p className="text-sidebar-foreground/70 text-sm mt-1">{t('settings.description')}</p>
        </div>
        
        <nav className="flex-1 p-4 bg-sidebar">
          <div className="space-y-1">
            <Button
              variant={activeTab === 'general' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/settings?tab=general')}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              {t('settings.tabs.general')}
            </Button>
            <Button
              variant={activeTab === 'profile' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/settings?tab=profile')}
            >
              <User className="w-4 h-4 mr-2" />
              {t('settings.tabs.profile')}
            </Button>
            <Button
              variant={activeTab === 'notifications' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/settings?tab=notifications')}
            >
              <Bell className="w-4 h-4 mr-2" />
              {t('settings.tabs.notifications')}
            </Button>
            <Button
              variant={activeTab === 'email-templates' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/settings?tab=email-templates')}
            >
              <Palette className="w-4 h-4 mr-2" />
              {t('settings.tabs.emailDesign')}
            </Button>
            <Button
              variant={activeTab === 'departments' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => navigate('/settings?tab=departments')}
            >
              <Building className="w-4 h-4 mr-2" />
              {t('settings.tabs.departments')}
            </Button>

            <div className="pt-4">
              <div className="text-xs font-medium text-sidebar-foreground/60 px-2 mb-2">Administration</div>
              <Button
                variant={activeTab === 'users' ? 'default' : 'ghost'}
                disabled={!canManageUsers}
                className="w-full justify-start"
                onClick={() => navigate('/settings?tab=users')}
              >
                <User className="w-4 h-4 mr-2" />
                {t('settings.tabs.users')}
              </Button>
              <Button
                variant={activeTab === 'admin' ? 'default' : 'ghost'}
                disabled={!canManageSettings}
                className="w-full justify-start"
                onClick={() => navigate('/settings?tab=admin')}
              >
                <Shield className="w-4 h-4 mr-2" />
                {t('settings.tabs.admin')}
              </Button>
            </div>
          </div>
        </nav>
        
        <div className="p-4 border-t border-sidebar-border bg-sidebar">
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

        {/* Content Area */}
        <ResponsiveContainer 
          className="flex-1 overflow-y-auto" 
          padding={{ sm: '4', md: '6' }}
          maxWidth="full"
        >
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {renderTabContent()}
          </div>
        </ResponsiveContainer>
      </main>
    </ResponsiveContainer>
  );
}