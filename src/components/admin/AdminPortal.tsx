import React from 'react';
import { useLocation } from 'react-router-dom';
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
import { VoiceIntegrationsList } from './VoiceIntegrationsList';
import { InboundRoutesList } from './InboundRoutesList';
import { InboxManagement } from './InboxManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Shield } from 'lucide-react';

export const AdminPortal = () => {
  const { t } = useTranslation();
  const location = useLocation();
  
  // Extract the admin path to determine which content to show
  const adminPath = location.pathname.replace('/admin/', '') || 'general';

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
        return (
          <ResponsiveTabs defaultValue="email" variant="pills" size="md" equalWidth>
            <ResponsiveTabsList className="w-full">
              <ResponsiveTabsTrigger value="email">
                <Mail className="w-4 h-4 mr-2" />
                Email & Routing
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="voice">
                <Phone className="w-4 h-4 mr-2" />
                Voice & Phone
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="messaging">
                <Shield className="w-4 h-4 mr-2" />
                Messaging
              </ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            
            <ResponsiveTabsContent value="email">
              <ResponsiveTabs defaultValue="sendgrid" variant="pills" size="sm">
              <ResponsiveTabsList>
                <ResponsiveTabsTrigger value="email-accounts">Email Accounts</ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="sendgrid">SendGrid</ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="google-groups">Google Groups</ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="routes">Inbound Routes</ResponsiveTabsTrigger>
              </ResponsiveTabsList>
              <ResponsiveTabsContent value="email-accounts">
                <EmailAccountConnection />
              </ResponsiveTabsContent>
              <ResponsiveTabsContent value="sendgrid">
                <SendgridSetupWizard />
              </ResponsiveTabsContent>
              <ResponsiveTabsContent value="google-groups">
                  <Card className="bg-gradient-surface border-border/50 shadow-surface">
                    <CardHeader>
                      <CardTitle className="text-primary">Google Groups Setup</CardTitle>
                      <CardDescription>Configure Google Groups for email routing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <GoogleGroupSetup 
                        alias="support" 
                        domain="yourdomain.com" 
                        parseSubdomain="inbound"
                        inboxName="Support"
                      />
                    </CardContent>
                  </Card>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="routes">
                  <InboundRoutesList />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </ResponsiveTabsContent>
            
            <ResponsiveTabsContent value="voice">
              <VoiceIntegrationsList />
            </ResponsiveTabsContent>
            
            <ResponsiveTabsContent value="messaging">
              <MessagingSettings />
            </ResponsiveTabsContent>
          </ResponsiveTabs>
        );

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
              <a href="/admin/integrations" className="text-primary hover:underline">
                Go to Integrations & Routing →
              </a>
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
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="library">
                  <DesignLibrary />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="components">
                  <ComponentConfigurationPanel />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'general':
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};