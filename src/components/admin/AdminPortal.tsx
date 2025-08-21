import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Users, Settings, Plug, Palette, Mail, Phone, Route, Building, Inbox } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { useTranslation } from 'react-i18next';

export const AdminPortal = () => {
  const { t } = useTranslation();
  return (
    <div className="pane">
      <div className="space-y-6">
        <div>
          <Heading level={2}>{t('admin.title')}</Heading>
          <p className="text-muted-foreground mt-1">
            {t('admin.description')}
          </p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-card/50 backdrop-blur-sm shadow-surface">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('admin.userManagement')}
            </TabsTrigger>
            <TabsTrigger value="inboxes" className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              {t('admin.inboxes')}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="w-4 h-4" />
              {t('admin.integrations')}
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {t('admin.voice')}
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              {t('admin.design')}
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('admin.general')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="space-y-6">
              <Tabs defaultValue="user-list" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="user-list">Users</TabsTrigger>
                  <TabsTrigger value="departments">Departments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="user-list">
                  <UserManagement />
                </TabsContent>
                
                <TabsContent value="departments">
                  <DepartmentManagement />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="inboxes">
            <InboxManagement />
          </TabsContent>

          <TabsContent value="integrations">
            <div className="space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="aircall">Aircall</TabsTrigger>
                  <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
                  <TabsTrigger value="google-groups">Google Groups</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview">
                  <IntegrationSettings />
                </TabsContent>
                
                <TabsContent value="aircall">
                  <AircallSettings />
                </TabsContent>
                
                <TabsContent value="sendgrid">
                  <SendgridSetupWizard />
                </TabsContent>
                
                <TabsContent value="google-groups">
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
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="voice">
            <div className="space-y-6">
              <Tabs defaultValue="integrations" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="integrations">Voice Integrations</TabsTrigger>
                  <TabsTrigger value="routes">Inbound Routes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="integrations">
                  <VoiceIntegrationsList />
                </TabsContent>
                
                <TabsContent value="routes">
                  <InboundRoutesList />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="design">
            <div className="space-y-6">
              <Tabs defaultValue="library" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="library">Design Library</TabsTrigger>
                  <TabsTrigger value="components">Components</TabsTrigger>
                </TabsList>
                
                <TabsContent value="library">
                  <DesignLibrary />
                </TabsContent>
                
                <TabsContent value="components">
                  <ComponentConfigurationPanel />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};