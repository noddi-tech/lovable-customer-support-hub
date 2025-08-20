import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Ticket, DoorOpen, Users } from 'lucide-react';
import ServiceTicketsInterface from './ServiceTicketsInterface';
import DoormanInterface from './DoormanInterface';
import RecruitmentInterface from './RecruitmentInterface';

const OpsWrapper = () => {
  const [activeSubSection, setActiveSubSection] = useState('serviceTickets');

  return (
    <div className="h-full">
      <Tabs value={activeSubSection} onValueChange={setActiveSubSection} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="serviceTickets">
            <Ticket className="h-4 w-4 mr-2" />
            Service Tickets
          </TabsTrigger>
          <TabsTrigger value="doorman">
            <DoorOpen className="h-4 w-4 mr-2" />
            Doorman
          </TabsTrigger>
          <TabsTrigger value="recruitment">
            <Users className="h-4 w-4 mr-2" />
            Recruitment
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="serviceTickets" className="m-0 h-full">
            <ServiceTicketsInterface />
          </TabsContent>
          <TabsContent value="doorman" className="m-0 h-full">
            <DoormanInterface />
          </TabsContent>
          <TabsContent value="recruitment" className="m-0 h-full">
            <RecruitmentInterface />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default OpsWrapper;