import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ticket, Shield, Users } from 'lucide-react';
import ServiceTicketsInterface from './ServiceTicketsInterface';
import DoormanInterface from './DoormanInterface';
import RecruitmentInterface from './RecruitmentInterface';
import { useTranslation } from 'react-i18next';

const OpsWrapper = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('serviceTickets');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-muted/30 px-6 py-3">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="serviceTickets" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              {t('serviceTickets')}
            </TabsTrigger>
            <TabsTrigger value="doorman" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('doorman')}
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('recruitment')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="serviceTickets" className="flex-1 m-0 p-0">
          <ServiceTicketsInterface />
        </TabsContent>

        <TabsContent value="doorman" className="flex-1 m-0 p-0">
          <DoormanInterface />
        </TabsContent>

        <TabsContent value="recruitment" className="flex-1 m-0 p-0">
          <RecruitmentInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OpsWrapper;