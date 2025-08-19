import React, { useState } from 'react';
import { Phone, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalls } from '@/hooks/useCalls';
import { CallStatusCard } from './voice/CallStatusCard';
import { CallEventsList } from './voice/CallEventsList';
import { CallStatsSummary } from './voice/CallStatsSummary';
import { CallbackRequestsList } from './voice/CallbackRequestsList';
import { VoicemailsList } from './voice/VoicemailsList';
import { CallsList } from './voice/CallsList';
import { WebhookTester } from './voice/WebhookTester';
import { VoiceSidebar } from './voice/VoiceSidebar';

export const VoiceInterface = () => {
  const { t } = useTranslation();
  const { 
    calls, 
    callEvents, 
    activeCalls, 
    recentCalls, 
    callsByStatus, 
    isLoading, 
    error 
  } = useCalls();
  
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState('ongoing-calls');

  if (error) {
    return (
      <div className="pane p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load call data. Please try again.
            <Button variant="outline" size="sm" className="ml-2">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="pane flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading call data...</p>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (selectedSection) {
      case 'ongoing-calls':
        return (
          <div className="space-y-6">
            <CallStatsSummary 
              callsByStatus={callsByStatus}
              activeCalls={activeCalls.length}
            />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                Active Calls ({activeCalls.length})
              </h3>
              {activeCalls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active calls</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCalls.map((call) => (
                    <CallStatusCard
                      key={call.id}
                      call={call}
                      onViewDetails={setSelectedCall}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'callbacks-pending':
      case 'callbacks-assigned':
      case 'callbacks-closed':
      case 'callbacks-all':
        return <CallbackRequestsList />;

      case 'voicemails-pending':
      case 'voicemails-assigned':
      case 'voicemails-closed':
      case 'voicemails-all':
        return <VoicemailsList />;

      case 'calls-today':
        return <CallsList />;

      case 'events-all':
        return <CallEventsList events={callEvents} />;

      case 'config-settings':
        return (
          <div className="space-y-6">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Webhook Configuration</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Configure your VoIP provider to send webhooks to:
              </p>
              <code className="text-sm bg-background p-2 rounded border block">
                https://qgfaycwsangsqzpveoup.functions.supabase.co/call-events-webhook/aircall
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Replace 'aircall' with your provider name for other services
              </p>
              
              <WebhookTester />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <CallStatsSummary 
              callsByStatus={callsByStatus}
              activeCalls={activeCalls.length}
            />
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a section from the sidebar</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-root bg-gradient-surface">
      {/* Header */}
      <div className="app-header">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Call Monitor
            </h2>
            <p className="text-muted-foreground">
              Real-time call events and monitoring
            </p>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="app-main bg-gradient-surface">
        {/* Sidebar */}
        <div className="nav-pane border-r border-border bg-card/80 backdrop-blur-sm shadow-surface">
          <VoiceSidebar 
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
          />
        </div>

        {/* Content Area */}
        <div className="detail-pane flex flex-col bg-gradient-surface">
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  );
};