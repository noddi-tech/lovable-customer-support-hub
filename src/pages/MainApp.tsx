import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Mail } from 'lucide-react';
import InteractionsWrapper from '@/components/dashboard/InteractionsWrapper';
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
              {t('emailMarketing')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="interactions" className="flex-1 m-0 p-0">
          <InteractionsWrapper />
        </TabsContent>

        <TabsContent value="marketing" className="flex-1 m-0 p-6">
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">{t('emailMarketing')}</h2>
              <p className="text-muted-foreground">{t('emailMarketingComingSoon')}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MainApp;