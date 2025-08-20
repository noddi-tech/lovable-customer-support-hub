import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronRight, MessageCircle, Megaphone, Wrench, Settings } from 'lucide-react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import OpsWrapper from '@/components/dashboard/OpsWrapper';
import SettingsWrapper from '@/components/dashboard/SettingsWrapper';

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('interactions');

  const getCurrentTabName = (tab: string) => {
    switch (tab) {
      case 'interactions':
        return 'Interactions';
      case 'marketing':
        return 'Marketing';
      case 'ops':
        return 'Ops';
      case 'services':
        return 'Services';
      default:
        return 'Interactions';
    }
  };

  const getSubTabName = (tab: string) => {
    switch (tab) {
      case 'interactions':
        return 'Text';
      case 'marketing':
        return 'Campaigns';
      case 'ops':
        return 'Operations';
      case 'services':
        return 'Settings';
      default:
        return 'Text';
    }
  };

  return (
    <div className="min-h-screen flex w-full">
      <div className="flex h-14 items-center border-b px-4 fixed top-0 left-0 right-0 z-50 bg-background">
        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground">{getCurrentTabName(activeTab)}</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{getSubTabName(activeTab)}</span>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col pt-14">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
          <TabsTrigger value="interactions">
            <MessageCircle className="h-4 w-4 mr-2" />
            Interactions
          </TabsTrigger>
          <TabsTrigger value="marketing">
            <Megaphone className="h-4 w-4 mr-2" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="ops">
            <Wrench className="h-4 w-4 mr-2" />
            Ops
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 p-4">
          <TabsContent value="interactions" className="m-0 h-full">
            <Dashboard />
          </TabsContent>
          <TabsContent value="marketing" className="m-0 h-full">
            <MarketingWrapper activeSubSection="campaigns" />
          </TabsContent>
          <TabsContent value="ops" className="m-0 h-full">
            <OpsWrapper activeSubSection="operations" />
          </TabsContent>
          <TabsContent value="settings" className="m-0 h-full">
            <SettingsWrapper activeSubSection="general" />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MainApp;