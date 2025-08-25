import React from 'react';
import { useLocation } from 'react-router-dom';
import { ResponsiveContainer, ResponsiveGrid, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, LayoutItem, AdaptiveSection } from '@/components/admin/design/components/layouts';
import { UserManagement } from './UserManagement';
import { DepartmentManagement } from './DepartmentManagement';
import { IntegrationSettings } from './IntegrationSettings';
import { GeneralSettings } from './GeneralSettings';
import { DesignLibrary } from './DesignLibrary';
import { ComponentConfigurationPanel } from './ComponentConfigurationPanel';
import { AircallSettings } from './AircallSettings';
import { SendgridSetupWizard } from './SendgridSetupWizard';
import { GoogleGroupSetup } from './GoogleGroupSetup';
import { VoiceIntegrationsList } from './VoiceIntegrationsList';
import { InboundRoutesList } from './InboundRoutesList';
import { InboxManagement } from './InboxManagement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { useTranslation } from 'react-i18next';

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
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <UserManagement />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="departments">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <DepartmentManagement />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'inboxes':
        return (
          <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="6">
            <LayoutItem className="md:col-span-2 lg:col-span-3">
              <AdaptiveSection spacing="4" className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <InboxManagement />
              </AdaptiveSection>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'integrations':
        return (
          <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
            <LayoutItem className="lg:col-span-2">
              <ResponsiveTabs defaultValue="overview" variant="pills" size="md" equalWidth>
                <ResponsiveTabsList className="w-full">
                  <ResponsiveTabsTrigger value="overview">Overview</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="aircall">Aircall</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="sendgrid">SendGrid</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="google-groups">Google Groups</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="overview">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <IntegrationSettings />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="aircall">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <AircallSettings />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="sendgrid">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <SendgridSetupWizard />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="google-groups">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <Card className="bg-gradient-surface border-border/50 shadow-surface">
                      <CardHeader>
                        <CardTitle className="text-primary">Google Groups Setup</CardTitle>
                        <CardDescription>
                          Configure Google Groups for email routing
                        </CardDescription>
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
                  </AdaptiveSection>
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'voice':
        return (
          <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
            <LayoutItem className="lg:col-span-2">
              <ResponsiveTabs defaultValue="integrations" variant="pills" size="md" equalWidth>
                <ResponsiveTabsList className="w-full">
                  <ResponsiveTabsTrigger value="integrations">Voice Integrations</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="routes">Inbound Routes</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="integrations">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <VoiceIntegrationsList />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="routes">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <InboundRoutesList />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'design':
        return (
          <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '4' }} gap="6">
            <LayoutItem className="md:col-span-2 lg:col-span-4">
              <ResponsiveTabs defaultValue="library" variant="pills" size="md" equalWidth>
                <ResponsiveTabsList className="w-full">
                  <ResponsiveTabsTrigger value="library">Design Library</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="components">
                    <a href="/admin/design/components" className="flex items-center">Components</a>
                  </ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="library">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <DesignLibrary />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="components">
                  <AdaptiveSection spacing="4" className="max-h-[calc(100vh-400px)] overflow-y-auto">
                    <ComponentConfigurationPanel />
                  </AdaptiveSection>
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </LayoutItem>
          </ResponsiveGrid>
        );

      case 'general':
      default:
        return (
          <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="6">
            <LayoutItem className="md:col-span-2 lg:col-span-3">
              <AdaptiveSection spacing="4" className="max-h-[calc(100vh-300px)] overflow-y-auto">
                <GeneralSettings />
              </AdaptiveSection>
            </LayoutItem>
          </ResponsiveGrid>
        );
    }
  };

  return (
    <div className="h-full">
      {renderContent()}
    </div>
  );
};