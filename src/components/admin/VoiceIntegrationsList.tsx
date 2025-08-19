import React, { useState } from 'react';
import { Phone, Settings, ChevronDown, ChevronRight, CheckCircle, AlertCircle, Plug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AircallSettings } from './AircallSettings';

interface VoiceIntegration {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'configured';
  isSupported: boolean;
}

export const VoiceIntegrationsList = () => {
  const [expandedIntegrations, setExpandedIntegrations] = useState<Record<string, boolean>>({});

  const voiceIntegrations: VoiceIntegration[] = [
    {
      id: 'aircall',
      name: 'Aircall',
      provider: 'Aircall',
      description: 'Cloud-based phone system with call analytics and CRM integrations',
      icon: Phone,
      status: 'connected',
      isSupported: true
    },
    {
      id: 'twilio',
      name: 'Twilio Voice',
      provider: 'Twilio',
      description: 'Programmable voice communications platform for custom telephony solutions',
      icon: Phone,
      status: 'disconnected',
      isSupported: false
    },
    {
      id: 'aws-connect',
      name: 'AWS Connect',
      provider: 'Amazon',
      description: 'Cloud contact center service with omnichannel customer service',
      icon: Phone,
      status: 'disconnected',
      isSupported: false
    },
    {
      id: 'microsoft-teams',
      name: 'Microsoft Teams Calling',
      provider: 'Microsoft',
      description: 'Enterprise calling solution integrated with Microsoft 365',
      icon: Phone,
      status: 'disconnected',
      isSupported: false
    }
  ];

  const toggleIntegration = (integrationId: string) => {
    setExpandedIntegrations(prev => ({
      ...prev,
      [integrationId]: !prev[integrationId]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'configured':
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Settings className="h-3 w-3" />
            Configured
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Not Connected
          </Badge>
        );
    }
  };

  const renderIntegrationContent = (integration: VoiceIntegration) => {
    if (integration.id === 'aircall') {
      return <AircallSettings />;
    }
    
    // Placeholder for other integrations
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Plug className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="font-medium">{integration.name} Integration</p>
        <p className="text-sm">Configuration for {integration.name} will be available soon</p>
        <p className="text-xs mt-2">Contact support if you need this integration urgently</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Voice Providers</h3>
          <p className="text-sm text-muted-foreground">
            Configure and manage your telephony integrations
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {voiceIntegrations.map((integration) => {
          const Icon = integration.icon;
          const isExpanded = expandedIntegrations[integration.id];
          
          return (
            <Card key={integration.id} className="bg-gradient-surface border-border/50 shadow-surface">
              <Collapsible 
                open={isExpanded}
                onOpenChange={() => toggleIntegration(integration.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {integration.name}
                            {getStatusBadge(integration.status)}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {!integration.isSupported && (
                          <Badge variant="outline" className="text-xs">
                            Coming Soon
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-2"
                          disabled={!integration.isSupported}
                        >
                          {integration.isSupported ? (
                            <>
                              <Settings className="h-4 w-4" />
                              Configure Integration
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </>
                          ) : (
                            <>
                              <Settings className="h-4 w-4" />
                              View Details
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-6">
                      {renderIntegrationContent(integration)}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
};