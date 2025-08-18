import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pane, PaneToolbar, PaneBody, LazyComponent } from '@/components/layout';
import { useResponsive } from '@/contexts/ResponsiveContext';
import { useTranslation } from 'react-i18next';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { 
  Shield, 
  Users, 
  Ticket, 
  ExternalLink, 
  Maximize2, 
  Minimize2,
  RefreshCw 
} from 'lucide-react';

interface OperationsService {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: React.ComponentType<any>;
  status: 'active' | 'maintenance' | 'coming-soon';
}

const operationsServices: OperationsService[] = [
  {
    id: 'doorman',
    title: 'Doorman Service',
    description: 'Security and access management platform',
    url: 'https://doorman.noddi.co/',
    icon: Shield,
    status: 'active'
  },
  {
    id: 'recruitment',
    title: 'Recruitment Portal',
    description: 'Manage hiring processes and candidate tracking',
    url: '#', // Placeholder
    icon: Users,
    status: 'coming-soon'
  },
  {
    id: 'tickets',
    title: 'Service Tickets',
    description: 'Track and manage service requests and maintenance',
    url: '#', // Placeholder
    icon: Ticket,
    status: 'coming-soon'
  }
];

const NewOpsWrapper = () => {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const { measureRender } = usePerformanceMonitoring('NewOpsWrapper');
  const [selectedService, setSelectedService] = useState<OperationsService | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleServiceSelect = (service: OperationsService) => {
    if (service.status === 'active') {
      setSelectedService(service);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">Active</Badge>;
      case 'maintenance':
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Maintenance</Badge>;
      case 'coming-soon':
        return <Badge variant="secondary" className="text-xs">Coming Soon</Badge>;
      default:
        return null;
    }
  };

  // Service grid view
  const servicesGrid = (
    <Pane className="flex-1">
      <PaneToolbar className="border-b p-4">
        <div className="flex items-center justify-between w-full">
          <h2 className="text-lg font-semibold">{t('operations')}</h2>
          {selectedService && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedService(null)}
            >
              Back to Services
            </Button>
          )}
        </div>
      </PaneToolbar>

      <PaneBody className="p-6">
        {!selectedService ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {operationsServices.map((service) => {
              const IconComponent = service.icon;
              return (
                <Card 
                  key={service.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    service.status === 'active' ? 'hover:border-primary' : 'opacity-75'
                  }`}
                  onClick={() => handleServiceSelect(service)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Button 
                        variant={service.status === 'active' ? 'default' : 'secondary'}
                        size="sm"
                        disabled={service.status !== 'active'}
                        className="w-full"
                      >
                        {service.status === 'active' ? (
                          <>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open Service
                          </>
                        ) : (
                          service.status === 'coming-soon' ? 'Coming Soon' : 'Under Maintenance'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          // Service iframe view
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <selectedService.icon className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{selectedService.title}</h3>
                {getStatusBadge(selectedService.status)}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  className="h-8"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedService.url, '_blank')}
                  className="h-8"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className={`flex-1 rounded-lg border bg-background overflow-hidden ${
              isFullscreen ? 'fixed inset-0 z-50 rounded-none' : ''
            }`}>
              <iframe
                key={refreshKey}
                src={selectedService.url}
                className="w-full h-full border-0"
                title={selectedService.title}
                allowFullScreen
                loading="lazy"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
              />
            </div>
          </div>
        )}
      </PaneBody>
    </Pane>
  );

  return (
    <LazyComponent>
      <div className="h-full flex bg-background">
        {servicesGrid}
      </div>
    </LazyComponent>
  );
};

export default NewOpsWrapper;