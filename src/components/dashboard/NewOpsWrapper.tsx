import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  Users, 
  Ticket
} from 'lucide-react';


const NewOpsWrapper = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('doorman');

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b bg-background px-6 py-3 sticky top-0 z-10">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="doorman" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t('ops.doorman') || 'Doorman'}
            </TabsTrigger>
            <TabsTrigger value="recruitment" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('ops.recruitment') || 'Recruitment'}
            </TabsTrigger>
            <TabsTrigger value="service-tickets" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              {t('ops.serviceTickets') || 'Service Tickets'}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="doorman" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-2">Doorman Service</h2>
              <p className="text-muted-foreground">Security and access management platform</p>
            </div>
            <iframe
              src="https://doorman.noddi.co/"
              className="w-full h-96 border rounded-lg"
              title="Doorman Service"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </TabsContent>

        <TabsContent value="recruitment" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full p-6 overflow-y-auto">
            <div className="text-center py-20">
              <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Recruitment Portal</h2>
              <p className="text-muted-foreground mb-4">Manage hiring processes and candidate tracking</p>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="service-tickets" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full p-6 overflow-y-auto">
            <div className="text-center py-20">
              <Ticket className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-bold mb-2">Service Tickets</h2>
              <p className="text-muted-foreground mb-4">Track and manage service requests and maintenance</p>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NewOpsWrapper;