import React, { useState, useMemo, useCallback } from 'react';
import { Phone, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownLeft, Clock, User, MessageSquare, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalls } from '@/hooks/useCalls';
import { useRealTimeCallNotifications } from '@/hooks/useRealTimeCallNotifications';
import { CallStatusCard } from './voice/CallStatusCard';
import { CallEventsList } from './voice/CallEventsList';
import { CallbackRequestsList } from './voice/CallbackRequestsList';
import { VoicemailsList } from './voice/VoicemailsList';
import { CallsList } from './voice/CallsList';
import { VoiceSidebar } from './voice/VoiceSidebar';
import { RealTimeIndicator } from './voice/RealTimeIndicator';
import { CallNotificationCenter } from './voice/CallNotificationCenter';
import { CallDetailsDialog } from './voice/CallDetailsDialog';
import { CallActionButton } from './voice/CallActionButton';
import { MasterDetailShell } from '@/components/admin/design/components/layouts/MasterDetailShell';
import { EntityListRow } from '@/components/admin/design/components/lists/EntityListRow';
import { ReplySidebar } from '@/components/admin/design/components/detail/ReplySidebar';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';

export const VoiceInterface = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigation = useInteractionsNavigation();
  
  // Get state from URL navigation
  const { conversationId } = navigation.currentState;
  const isDetail = !!conversationId;
  
  const { 
    calls, 
    callEvents, 
    activeCalls, 
    recentCalls, 
    callsByStatus, 
    isLoading, 
    error 
  } = useCalls();
  
  // Initialize real-time notifications
  useRealTimeCallNotifications();
  
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState('ongoing-calls');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Mock call queue list - in real app this would come from API
  const callQueues = useMemo(() => [
    { id: 'active', name: 'Active Calls', count: activeCalls.length, icon: <Phone className="h-4 w-4" /> },
    { id: 'callbacks-pending', name: 'Pending Callbacks', count: 23, icon: <Clock className="h-4 w-4" /> },
    { id: 'voicemails', name: 'Voicemails', count: 8, icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'recent', name: 'Recent Calls', count: calls.length, icon: <Phone className="h-4 w-4" /> }
  ], [activeCalls.length, calls.length]);

  // Transform calls to entities for the list
  const callEntities = useMemo(() => {
    const filteredCalls = selectedSection === 'ongoing-calls' ? activeCalls : calls;
    
    return filteredCalls.map(call => ({
      id: call.id,
      subject: call.customer_phone || 'Unknown Number',
      preview: call.direction === 'inbound' ? 'Incoming call' : 'Outgoing call',
      customer: {
        phone: call.customer_phone || 'Unknown',
        initials: 'UC'
      },
      status: call.status,
      direction: call.direction,
      duration: call.duration_seconds,
      endedAt: call.ended_at,
      agentPhone: call.agent_phone,
      metadata: call.metadata
    }));
  }, [activeCalls, calls, selectedSection]);

  // Find selected call entity
  const selectedCallEntity = conversationId ? 
    callEntities.find(c => c.id === conversationId) : null;

  const handleRefreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['call-events'] });
    queryClient.invalidateQueries({ queryKey: ['voicemails'] });
    queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
    queryClient.invalidateQueries({ queryKey: ['call-notifications'] });
  }, [queryClient]);

  const handleCallSelect = useCallback((callEntity: any) => {
    navigation.navigateToConversation(callEntity.id);
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.clearConversation();
  }, [navigation]);

  const handleQueueSelect = useCallback((queueId: string) => {
    setSelectedSection(queueId);
    navigation.navigateToInbox(queueId);
  }, [navigation]);

  const handleAddCallNote = useCallback(async (note: string) => {
    console.log('Adding call note:', note);
    // In real app, save note to API
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, []);

  if (error) {
    return (
      <Card className="m-6">
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load call data. Please try again.
              <Button variant="outline" size="sm" className="ml-2" onClick={handleRefreshAll}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="m-6">
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading call data...</p>
        </CardContent>
      </Card>
    );
  }

  // Format phone number for display
  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Render queue list
  const renderQueueList = () => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground/70 px-2 pb-2">Call Queues</h3>
      <div className="space-y-1">
        {callQueues.map((queue) => (
          <Button
            key={queue.id}
            variant={selectedSection === queue.id ? "secondary" : "ghost"}
            className="w-full justify-between h-auto px-3 py-2 text-left"
            onClick={() => handleQueueSelect(queue.id)}
          >
            <div className="flex items-center gap-2">
              <span className="flex-shrink-0">{queue.icon}</span>
              <span className="text-sm font-medium truncate">{queue.name}</span>
            </div>
            {queue.count > 0 && (
              <Badge variant="secondary" className="ml-2 px-2 py-0 h-5 text-xs">
                {queue.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );

  // Render call list
  const renderCallList = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Calls</h2>
        <RealTimeIndicator onRefresh={handleRefreshAll} />
      </div>
      
      <div className="space-y-2">
        {callEntities.map((callEntity) => (
          <EntityListRow
            key={callEntity.id}
            subject={formatPhoneNumber(callEntity.customer.phone)}
            preview={`${callEntity.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call • ${callEntity.status}`}
            avatar={{
              fallback: callEntity.customer.initials,
              alt: callEntity.customer.phone
            }}
            selected={callEntity.id === conversationId}
            onClick={() => handleCallSelect(callEntity)}
            badges={[
              { 
                label: callEntity.direction === 'inbound' ? 'In' : 'Out', 
                variant: callEntity.direction === 'inbound' ? 'default' as const : 'secondary' as const 
              },
              { label: callEntity.status, variant: 'outline' as const }
            ]}
            meta={[
              { 
                label: 'Duration', 
                value: formatDuration(callEntity.duration) 
              },
              { 
                label: 'Time', 
                value: callEntity.endedAt ? 
                  format(new Date(callEntity.endedAt), 'HH:mm') : 
                  'Active'
              },
              ...(callEntity.agentPhone ? [{ 
                label: 'Agent', 
                value: formatPhoneNumber(callEntity.agentPhone) 
              }] : [])
            ]}
          />
        ))}
      </div>
    </div>
  );

  // Render call details
  const renderCallDetails = () => {
    if (!selectedCallEntity) return null;

    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold mb-2">Call Details</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatPhoneNumber(selectedCallEntity.customer.phone)}</span>
                <span>•</span>
                <span>{selectedCallEntity.direction === 'inbound' ? 'Incoming' : 'Outgoing'}</span>
                <span>•</span>
                <span>{formatDuration(selectedCallEntity.duration)}</span>
              </div>
            </div>
            
            <div className="border-t border-border pt-4">
              <h3 className="font-medium mb-2">Call Information</h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-muted-foreground">Status:</span>
                    <span className="ml-2">{selectedCallEntity.status}</span>
                  </div>
                  <div>
                    <span className="font-medium text-muted-foreground">Direction:</span>
                    <span className="ml-2">{selectedCallEntity.direction}</span>
                  </div>
                  {selectedCallEntity.endedAt && (
                    <div>
                      <span className="font-medium text-muted-foreground">Ended:</span>
                      <span className="ml-2">{format(new Date(selectedCallEntity.endedAt), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                  {selectedCallEntity.agentPhone && (
                    <div>
                      <span className="font-medium text-muted-foreground">Agent:</span>
                      <span className="ml-2">{formatPhoneNumber(selectedCallEntity.agentPhone)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render actions sidebar
  const renderActionsSidebar = () => {
    if (!selectedCallEntity) return null;

    return (
      <ReplySidebar
        conversationId={selectedCallEntity.id}
        onSendReply={handleAddCallNote}
        placeholder="Add call notes..."
        showMetadata={false}
        showActions={true}
      />
    );
  };

  return (
    <>
      <MasterDetailShell
        left={renderQueueList()}
        center={renderCallList()}
        detailLeft={renderCallDetails()}
        detailRight={renderActionsSidebar()}
        isDetail={isDetail}
        onBack={handleBack}
        backButtonLabel="Back to Calls"
        leftPaneLabel="Call queues"
        centerPaneLabel="Call list"
        detailLeftLabel="Call details"
        detailRightLabel="Call actions"
      />
      
      {/* Call Details Dialog */}
      <CallDetailsDialog
        call={selectedCall}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
};