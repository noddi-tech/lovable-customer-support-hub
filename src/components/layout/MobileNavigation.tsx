import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail, Wrench } from 'lucide-react';
import { useResponsive } from '@/contexts/ResponsiveContext';
import { useTranslation } from 'react-i18next';

interface MobileNavigationProps {
  interactions: React.ReactNode;
  marketing: React.ReactNode;
  ops: React.ReactNode;
}

export const MobileNavigation = ({ interactions, marketing, ops }: MobileNavigationProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('interactions');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-background px-4 py-3 sticky top-0 z-10">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="interactions" className="flex items-center gap-2 text-xs">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">{t('interactions')}</span>
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2 text-xs">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">{t('marketing')}</span>
            </TabsTrigger>
            <TabsTrigger value="ops" className="flex items-center gap-2 text-xs">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">{t('ops')}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="interactions" className="flex-1 m-0 p-0 overflow-hidden">
          {interactions}
        </TabsContent>

        <TabsContent value="marketing" className="flex-1 m-0 p-0 overflow-hidden">
          {marketing}
        </TabsContent>

        <TabsContent value="ops" className="flex-1 m-0 p-0 overflow-hidden">
          {ops}
        </TabsContent>
      </Tabs>
    </div>
  );
};