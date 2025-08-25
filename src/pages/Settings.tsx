import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, LayoutItem, AdaptiveSection } from '@/components/admin/design/components/layouts';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Settings as SettingsIcon, User, Bell, MessageSquare, Camera, Palette, Building } from 'lucide-react';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SettingsSidebar } from '@/components/layout/SettingsSidebar';

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
  const location = useLocation();
  
  const canManageUsers = hasPermission('manage_users');
  const canManageSettings = hasPermission('manage_settings');
  
  // Determine if we're in admin mode based on the URL path
  const isAdminPath = location.pathname.startsWith('/admin/');
  const adminPath = location.pathname.replace('/admin/', '');
  const activeTab = isAdminPath ? adminPath : 'general';

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">{t('common.loading')}</div>
      </div>
    );
  }

  // Check if we're in admin mode or settings
  const isAdminMode = location.pathname.startsWith('/admin/');
  
  function renderAdminContent() {
    if (location.pathname === '/admin/design/components') {
      const AdminDesignComponents = React.lazy(() => import('./AdminDesignComponents'));
      return (
        <React.Suspense fallback={<div>Loading...</div>}>
          <AdminDesignComponents />
        </React.Suspense>
      );
    }
    
    return <AdminPortal />;
  }

  function renderSettingsContent() {
    const path = location.pathname;
    
    switch (path) {
      case '/settings':
      case '/settings/general':
        return (
          <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
            <LayoutItem>
              <LanguageSettings />
            </LayoutItem>
            <LayoutItem>
              <TimezoneSettings />
            </LayoutItem>
          </ResponsiveGrid>
        );
      
      case '/settings/profile':
        return (
          <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="6">
            <LayoutItem>
              <Card>
                <CardHeader>
                  <CardTitle>Profile Settings</CardTitle>
                  <CardDescription>Manage your personal profile information</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Profile management coming soon</p>
                </CardContent>
              </Card>
            </LayoutItem>
          </ResponsiveGrid>
        );
      
      case '/settings/notifications':
        return (
          <ResponsiveGrid cols={{ sm: '1', md: '2' }} gap="6">
            <LayoutItem>
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Configure your notification preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Notification settings coming soon</p>
                </CardContent>
              </Card>
            </LayoutItem>
          </ResponsiveGrid>
        );
      
      case '/settings/email-templates':
        return <EmailTemplateSettings />;
      
      case '/settings/departments':
        return <DepartmentManagement />;
      
      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Page not found</p>
          </div>
        );
    }
  }


  if (isAdminMode) {
    return (
      <UnifiedAppLayout sidebar={<SettingsSidebar />}>
        {renderAdminContent()}
      </UnifiedAppLayout>
    );
  }

  return (
    <UnifiedAppLayout sidebar={<SettingsSidebar />}>
      {renderSettingsContent()}
    </UnifiedAppLayout>
  );
}