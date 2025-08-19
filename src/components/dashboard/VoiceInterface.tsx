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
import { WebhookTester } from './voice/WebhookTester';

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

  return (
    <div className="pane p-6 h-full overflow-y-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Voice Call Monitor
            </h2>
            <p className="text-muted-foreground">
              Real-time call events and monitoring
            </p>
          </div>
        </div>

        {/* Stats Summary */}
        <CallStatsSummary 
          callsByStatus={callsByStatus}
          activeCalls={activeCalls.length}
        />

        {/* Callback Requests */}
        <CallbackRequestsList />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Calls */}
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

            {/* Recent Calls */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">
                Recent Calls
              </h3>
              {recentCalls.length === 0 ? (
                <p className="text-muted-foreground">No recent calls</p>
              ) : (
                <div className="space-y-2">
                  {recentCalls.slice(0, 5).map((call) => (
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

          {/* Call Events */}
          <div className="space-y-4">
            <CallEventsList events={callEvents} />
          </div>
        </div>

        {/* Webhook Info */}
        <div className="mt-8 p-4 bg-muted rounded-lg">
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
          
          {/* Webhook Tester */}
          <WebhookTester />
        </div>
      </div>
    </div>
  );
};