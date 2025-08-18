import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare } from 'lucide-react';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import { useTranslation } from 'react-i18next';
import NewsletterBuilder from './NewsletterBuilder';

const MarketingWrapper = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('email');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-background px-6 py-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t('email')}
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('sms')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="email" className="flex-1 m-0 p-0">
          <NewsletterBuilder />
        </TabsContent>

        <TabsContent value="sms" className="flex-1 m-0 p-0">
          <SMSInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingWrapper;