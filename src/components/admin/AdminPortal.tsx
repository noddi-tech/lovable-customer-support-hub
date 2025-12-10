import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, LayoutItem, AdaptiveSection } from '@/components/admin/design/components/layouts';
import { UserManagement } from './UserManagement';
import { DepartmentManagement } from './DepartmentManagement';
import { MessagingSettings } from './MessagingSettings';
import { GeneralSettings } from './GeneralSettings';
import { DesignLibrary } from './DesignLibrary';
import { ComponentConfigurationPanel } from './ComponentConfigurationPanel';
import { AircallSettings } from './AircallSettings';
import { SendgridSetupWizard } from './SendgridSetupWizard';
import { GoogleGroupSetup } from './GoogleGroupSetup';
import { EmailAccountConnection } from '@/components/dashboard/EmailAccountConnection';
import { EmailTemplateSettings } from '@/components/settings/EmailTemplateSettings';
import { VoiceIntegrationsList } from './VoiceIntegrationsList';
import { InboundRoutesList } from './InboundRoutesList';
import { InboxManagement } from './InboxManagement';
import { SystemHealthPage } from './SystemHealthPage';
import { HelpScoutImport } from './HelpScoutImport';
import { EmailIntegrationWizard } from './EmailIntegrationWizard';
import { IntegrationSettings } from './IntegrationSettings';
import { AdminDashboard } from './AdminDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Shield, Plus, Inbox } from 'lucide-react';

export const AdminPortal = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  
  // Extract the admin path to determine which content to show
  const pathParts = location.pathname.split('/').filter(Boolean);
  const adminPath = pathParts.length > 1 ? pathParts[1] : '';

  const renderContent = () => {
    switch (adminPath) {
      case 'users':
        return (
          <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6" className="h-full">
            <LayoutItem className="lg:col-span-2">
              <ResponsiveTabs defaultValue="user-list" variant="pills" size="md" equalWidth>
                <ResponsiveTabsList className="w-full">
                  <ResponsiveTabsTrigger value="user-list">Users</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="departments">Departments</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="user-list">
                  <UserManagement />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="departments">
                  <DepartmentManagement />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'inboxes':
        return <InboxManagement />;

      case 'integrations':
        return <IntegrationSettings />;

      case 'health':
        return <SystemHealthPage />;

      case 'voice':
        // Redirect to integrations tab
        return (
          <Card className="bg-gradient-surface border-border/50 shadow-surface">
            <CardHeader>
              <CardTitle>Voice settings moved</CardTitle>
              <CardDescription>
                Voice integrations are now under Integrations & Routing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                All voice and phone configurations have been consolidated under the new Integrations & Routing section.
              </p>
              <Link to="/admin/integrations" className="text-primary hover:underline">
                Go to Integrations & Routing →
              </Link>
            </CardContent>
          </Card>
        );

      case 'design':
        return (
          <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '4' }} gap="6">
            <LayoutItem className="md:col-span-2 lg:col-span-4">
              <ResponsiveTabs defaultValue="library" variant="pills" size="md" equalWidth>
                <ResponsiveTabsList className="w-full">
                  <ResponsiveTabsTrigger value="library">Design Library</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="components">Components</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="email-templates">Email Templates</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="library">
                  <DesignLibrary />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="components">
                  <ComponentConfigurationPanel />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="email-templates">
                  <EmailTemplateSettings />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'general':
        return <GeneralSettings />;
        
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};