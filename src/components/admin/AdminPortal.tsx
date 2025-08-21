import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagement } from './UserManagement';
import { IntegrationSettings } from './IntegrationSettings';
import { GeneralSettings } from './GeneralSettings';
import { DesignLibrary } from './DesignLibrary';
import { Users, Settings, Plug, Palette } from 'lucide-react';
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
          <TabsList className="grid w-full grid-cols-4 bg-card/50 backdrop-blur-sm shadow-surface">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('admin.userManagement')}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="w-4 h-4" />
              {t('admin.integrations')}
            </TabsTrigger>
            <TabsTrigger value="design" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              {t('admin.designLibrary')}
            </TabsTrigger>
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {t('admin.general')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationSettings />
          </TabsContent>

          <TabsContent value="design">
            <DesignLibrary />
          </TabsContent>

          <TabsContent value="general">
            <GeneralSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};