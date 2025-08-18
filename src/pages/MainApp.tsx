import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail } from 'lucide-react';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
import MarketingWrapper from '@/components/dashboard/MarketingWrapper';
import { useTranslation } from 'react-i18next';

const MainApp = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('interactions');

  return (
    <div className="h-screen flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-background px-6 py-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="interactions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('interactions')}
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('marketing')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="interactions" className="flex-1 m-0 p-0">
          <InteractionsWrapper />
        </TabsContent>

        <TabsContent value="marketing" className="flex-1 m-0 p-0">
          <MarketingWrapper />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainApp;