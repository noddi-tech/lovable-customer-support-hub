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
import { ResponsiveContainer, ResponsiveTabs, AdaptiveSection } from '../design/components/layouts';

export const AdminPortal = () => {
  const { t } = useTranslation();

  const mainTabs = [
    {
      value: 'users',
      label: t('admin.userManagement'),
      icon: Users,
      content: (
        <ResponsiveTabs
          orientation="responsive"
          breakpoint="md"
          items={[
            {
              value: 'user-list',
              label: 'Users',
              content: <UserManagement />
            },
            {
              value: 'departments',
              label: 'Departments',
              content: <DepartmentManagement />
            }
          ]}
          defaultValue="user-list"
        />
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
        <ResponsiveTabs
          orientation="responsive"
          breakpoint="md"
          items={[
            {
              value: 'overview',
              label: 'Overview',
              content: <IntegrationSettings />
            },
            {
              value: 'aircall',
              label: 'Aircall',
              content: <AircallSettings />
            },
            {
              value: 'sendgrid',
              label: 'SendGrid',
              content: <SendgridSetupWizard />
            },
            {
              value: 'google-groups',
              label: 'Google Groups',
              content: (
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
              )
            }
          ]}
          defaultValue="overview"
        />
      )
    },
    {
      value: 'voice',
      label: t('admin.voice'),
      icon: Phone,
      content: (
        <ResponsiveTabs
          orientation="responsive"
          breakpoint="md"
          items={[
            {
              value: 'integrations',
              label: 'Voice Integrations',
              content: <VoiceIntegrationsList />
            },
            {
              value: 'routes',
              label: 'Inbound Routes',
              content: <InboundRoutesList />
            }
          ]}
          defaultValue="integrations"
        />
      )
    },
    {
      value: 'design',
      label: t('admin.design'),
      icon: Palette,
      content: (
        <ResponsiveTabs
          orientation="responsive"
          breakpoint="md"
          items={[
            {
              value: 'library',
              label: 'Design Library',
              content: <DesignLibrary />
            },
            {
              value: 'components',
              label: 'Components',
              content: <ComponentConfigurationPanel />
            }
          ]}
          defaultValue="library"
        />
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
    <ResponsiveContainer className="pane" padding={{ sm: '4', md: '6' }}>
      <AdaptiveSection spacing={{ sm: '4', md: '6' }}>
        <AdaptiveSection spacing="2">
          <Heading level={2}>{t('admin.title')}</Heading>
          <p className="text-muted-foreground">
            {t('admin.description')}
          </p>
        </AdaptiveSection>

        <ResponsiveTabs
          items={mainTabs}
          defaultValue="users"
          orientation="responsive"
          breakpoint="lg"
          fullWidth
          variant="default"
          className="bg-card/50 backdrop-blur-sm shadow-surface"
        />
      </AdaptiveSection>
    </ResponsiveContainer>
  );
};