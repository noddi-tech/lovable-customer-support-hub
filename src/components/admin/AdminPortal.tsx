import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserManagement } from './UserManagement';
import { IntegrationSettings } from './IntegrationSettings';
import { GeneralSettings } from './GeneralSettings';
import { Users, Settings, Plug } from 'lucide-react';

export const AdminPortal = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Admin Portal</h2>
        <p className="text-muted-foreground">
          Manage organization settings, users, and integrations
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Plug className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UserManagement />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="general">
          <GeneralSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};