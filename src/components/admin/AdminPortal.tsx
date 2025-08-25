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
import { ResponsiveContainer, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, AdaptiveSection } from '@/components/admin/design/components/layouts';

export const AdminPortal = () => {
  const { t } = useTranslation();

  const mainTabs = [
    {
      value: 'users',
      label: t('admin.userManagement'),
      icon: Users,
      content: (
        <ResponsiveTabs defaultValue="user-list" variant="pills" size="md" equalWidth>
          <ResponsiveTabsList>
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
      )
    },
    {
      value: 'inboxes',
      label: t('admin.inboxes'),
      icon: Inbox,
      content: <InboxManagement />
    },
    {
      value: 'integrations',
      label: t('admin.integrations'),
      icon: Plug,
      content: (
        <ResponsiveTabs defaultValue="overview" variant="pills" size="md" equalWidth>
          <ResponsiveTabsList>
            <ResponsiveTabsTrigger value="overview">Overview</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="aircall">Aircall</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="sendgrid">SendGrid</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="google-groups">Google Groups</ResponsiveTabsTrigger>
          </ResponsiveTabsList>
          <ResponsiveTabsContent value="overview">
            <IntegrationSettings />
          </ResponsiveTabsContent>
          <ResponsiveTabsContent value="aircall">
            <AircallSettings />
          </ResponsiveTabsContent>
          <ResponsiveTabsContent value="sendgrid">
            <SendgridSetupWizard />
          </ResponsiveTabsContent>
          <ResponsiveTabsContent value="google-groups">
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
          </ResponsiveTabsContent>
        </ResponsiveTabs>
      )
    },
    {
      value: 'voice',
      label: t('admin.voice'),
      icon: Phone,
      content: (
        <ResponsiveTabs defaultValue="integrations" variant="pills" size="md" equalWidth>
          <ResponsiveTabsList>
            <ResponsiveTabsTrigger value="integrations">Voice Integrations</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="routes">Inbound Routes</ResponsiveTabsTrigger>
          </ResponsiveTabsList>
          <ResponsiveTabsContent value="integrations">
            <VoiceIntegrationsList />
          </ResponsiveTabsContent>
          <ResponsiveTabsContent value="routes">
            <InboundRoutesList />
          </ResponsiveTabsContent>
        </ResponsiveTabs>
      )
    },
    {
      value: 'design',
      label: t('admin.design'),
      icon: Palette,
      content: (
        <ResponsiveTabs defaultValue="library" variant="pills" size="md" equalWidth>
          <ResponsiveTabsList>
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
      )
    },
    {
      value: 'general',
      label: t('admin.general'),
      icon: Settings,
      content: <GeneralSettings />
    }
  ];

  return (
    <ResponsiveContainer className="flex h-full" maxWidth="full">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-card border-r border-border shadow-surface hidden lg:flex flex-col">
        <div className="p-4 border-b border-border">
          <Heading level={3} className="text-lg">{t('admin.title')}</Heading>
          <p className="text-muted-foreground text-sm mt-1">
            {t('admin.description')}
          </p>
        </div>
        
        <nav className="flex-1 p-3">
          <ResponsiveTabs 
            defaultValue="users" 
            variant="pills" 
            size="sm" 
            orientation="vertical"
            className="w-full"
          >
            <ResponsiveTabsList className="flex-col bg-transparent gap-1 w-full">
              {mainTabs.map((tab) => (
                <ResponsiveTabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="w-full justify-start text-left"
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </ResponsiveTabsTrigger>
              ))}
            </ResponsiveTabsList>
          </ResponsiveTabs>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Mobile Header with Tabs */}
        <div className="lg:hidden border-b border-border bg-card/50">
          <div className="p-4">
            <Heading level={3}>{t('admin.title')}</Heading>
            <p className="text-muted-foreground text-sm">{t('admin.description')}</p>
          </div>
          <ResponsiveTabs 
            defaultValue="users" 
            variant="underline" 
            size="sm" 
            equalWidth 
            scrollable
          >
            <ResponsiveTabsList className="bg-transparent border-none px-4">
              {mainTabs.map((tab) => (
                <ResponsiveTabsTrigger key={tab.value} value={tab.value}>
                  <tab.icon className="w-4 h-4" />
                </ResponsiveTabsTrigger>
              ))}
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
            defaultValue="users" 
            variant="borderless"
            className="h-full"
          >
            {mainTabs.map((tab) => (
              <ResponsiveTabsContent key={tab.value} value={tab.value} className="h-full">
                <AdaptiveSection spacing="6" className="max-h-[calc(100vh-300px)] overflow-y-auto">
                  {tab.content}
                </AdaptiveSection>
              </ResponsiveTabsContent>
            ))}
          </ResponsiveTabs>
        </ResponsiveContainer>
      </main>
    </ResponsiveContainer>
  );
};