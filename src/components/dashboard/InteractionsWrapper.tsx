import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageCircle, Phone } from 'lucide-react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { VoiceInterface } from '@/components/dashboard/VoiceInterface';

const InteractionsWrapper = () => {
  const [activeSubSection, setActiveSubSection] = useState('text');

  return (
    <div className="h-full">
      <Tabs value={activeSubSection} onValueChange={setActiveSubSection} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="text">
            <MessageCircle className="h-4 w-4 mr-2" />
            Text
          </TabsTrigger>
          <TabsTrigger value="voice">
            <Phone className="h-4 w-4 mr-2" />
            Voice
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="text" className="m-0 h-full">
            <Dashboard />
          </TabsContent>
          <TabsContent value="voice" className="m-0 h-full">
            <VoiceInterface />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default InteractionsWrapper;