import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mail, MessageSquare } from 'lucide-react';
import { SMSInterface } from '@/components/dashboard/SMSInterface';
import NewsletterBuilder from './NewsletterBuilder';

const MarketingWrapper = () => {
  const [activeSubSection, setActiveSubSection] = useState('email');

  return (
    <div className="h-full">
      <Tabs value={activeSubSection} onValueChange={setActiveSubSection} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="email">
            <Mail className="h-4 w-4 mr-2" />
            Email
          </TabsTrigger>
          <TabsTrigger value="sms">
            <MessageSquare className="h-4 w-4 mr-2" />
            SMS
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="email" className="m-0 h-full">
            <NewsletterBuilder />
          </TabsContent>
          <TabsContent value="sms" className="m-0 h-full">
            <SMSInterface />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default MarketingWrapper;