import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Megaphone, Wrench, Settings } from 'lucide-react';

interface AppHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, onTabChange }) => {
  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="flex h-full items-center px-4">
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList className="grid w-full max-w-md grid-cols-4">
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
          </Tabs>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;