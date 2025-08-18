import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Phone } from 'lucide-react';
import { NewDashboard } from '@/components/dashboard/NewDashboard';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';
import { useTranslation } from 'react-i18next';

const InteractionsWrapper = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('text');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-background px-6 py-3">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('textCommunication')}
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {t('voiceCommunication')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="text" className="flex-1 m-0 p-0">
          <NewDashboard />
        </TabsContent>

        <TabsContent value="voice" className="flex-1 m-0 p-0">
          <VoiceInterface />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InteractionsWrapper;