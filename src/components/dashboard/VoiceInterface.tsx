import React, { useState, useMemo, useCallback, memo } from 'react';
import { Phone, AlertCircle, RefreshCw, ArrowUpRight, ArrowDownLeft, Clock, User, MessageSquare, Calendar, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCalls } from '@/hooks/useCalls';
import { useCallbackRequests } from '@/hooks/useCallbackRequests';
import { useVoicemails } from '@/hooks/useVoicemails';
import { useRealTimeCallNotifications } from '@/hooks/useRealTimeCallNotifications';
import { CallStatusCard } from './voice/CallStatusCard';
import { CallEventsList } from './voice/CallEventsList';
import { CallbackRequestsList } from './voice/CallbackRequestsList';
import { VoicemailsList } from './voice/VoicemailsList';
import { CallsList } from './voice/CallsList';
import { VoiceSidebar } from './voice/VoiceSidebar';
import { VoiceCustomerSidebar } from './voice/VoiceCustomerSidebar';
import { RealTimeIndicator } from './voice/RealTimeIndicator';
import { CallNotificationCenter } from './voice/CallNotificationCenter';
import { CallDetailsDialog } from './voice/CallDetailsDialog';
import { CallActionButton } from './voice/CallActionButton';
import { IncomingCallModal } from './voice/IncomingCallModal';
import { VoiceLayout } from './voice/VoiceLayout';
import { AircallPhoneBar } from './voice/AircallPhoneBar';
import { AircallLoginModal, AircallBlockedModal } from './voice';
import { ConnectionDiagnostic } from './voice/ConnectionDiagnostic';
import { AircallDebugPanel } from './voice/AircallDebugPanel';
import { AircallErrorBoundary } from '@/components/error/AircallErrorBoundary';
import { EntityListRow } from '@/components/admin/design/components/lists/EntityListRow';
import { useAircallPhone } from '@/hooks/useAircallPhone';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

// Memoized loading fallback
const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center h-full">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
));
LoadingFallback.displayName = 'LoadingFallback';

export const VoiceInterface = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigation = useInteractionsNavigation();
  // PHASE 4: Add skipPhoneIntegration to destructuring
  const { 
    showLoginModal, 
    showBlockedModal,
    diagnosticIssues,
    isConnected, 
    initializationPhase,
    handleManualLoginConfirm,
    retryConnection,
    openIncognito,
    skipPhoneIntegration,
    forceInitialization,
  } = useAircallPhone();
  
  // Get state from URL navigation
  const { conversationId } = navigation.currentState;
  
  const { 
    calls, 
    callEvents, 
    activeCalls, 
    recentCalls, 
    callsByStatus, 
    isLoading, 
    error 
  } = useCalls();
  
  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*');
      if (error) throw error;
      return data;
    }
  });
  
  const { 
    callbackRequests,
    pendingRequests,
    processedRequests,
    completedRequests
  } = useCallbackRequests();
  
  const { voicemails } = useVoicemails();
  
  // Initialize real-time notifications
  const { incomingCall, isIncomingCallModalOpen, closeIncomingCallModal, isWebSocketBlocked } = useRealTimeCallNotifications();
  
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [selectedSection, setSelectedSection] = useState('ongoing-calls');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Filter calls based on selected section
  const getFilteredData = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (selectedSection) {
      // Active calls
      case 'ongoing-calls':
        return { type: 'calls', data: activeCalls };
      
      // Callback requests
      case 'callbacks-pending':
        return { type: 'callbacks', data: pendingRequests || [] };
      case 'callbacks-assigned':
        return { type: 'callbacks', data: processedRequests || [] };
      case 'callbacks-closed':
        return { type: 'callbacks', data: completedRequests || [] };
      case 'callbacks-all':
        return { type: 'callbacks', data: callbackRequests || [] };
      
      // Voicemails
      case 'voicemails-pending':
        return { type: 'voicemails', data: voicemails?.filter(vm => vm.status === 'pending') || [] };
      case 'voicemails-assigned':
        return { type: 'voicemails', data: voicemails?.filter(vm => vm.status === 'assigned') || [] };
      case 'voicemails-closed':
        return { type: 'voicemails', data: voicemails?.filter(vm => vm.status === 'closed') || [] };
      case 'voicemails-all':
        return { type: 'voicemails', data: voicemails || [] };
      
      // Calls with date filters
      case 'calls-today':
        return { 
          type: 'calls', 
          data: calls.filter(call => {
            const callDate = new Date(call.started_at);
            return callDate >= today;
          })
        };
      case 'calls-yesterday':
        return { 
          type: 'calls', 
          data: calls.filter(call => {
            const callDate = new Date(call.started_at);
            return callDate >= yesterday && callDate < today;
          })
        };
      case 'calls-all':
        return { type: 'calls', data: calls };
      
      // Events
      case 'events-log':
        return { type: 'events', data: callEvents || [] };
      
      default:
        return { type: 'calls', data: activeCalls };
    }
  }, [activeCalls, calls, selectedSection, callbackRequests, pendingRequests, processedRequests, completedRequests, voicemails, callEvents]);

  // Transform data to entities for the list
  const entities = useMemo(() => {
    const { type, data } = getFilteredData;
    
    if (type === 'calls') {
      return data.map(call => ({
        id: call.id,
        type: 'call',
        subject: call.customers?.full_name || call.customer_phone || 'Unknown Number',
        preview: call.direction === 'inbound' ? 'Incoming call' : 'Outgoing call',
        customer: {
          id: call.customers?.id,
          phone: call.customer_phone || 'Unknown',
          email: call.customers?.email,
          full_name: call.customers?.full_name,
          initials: call.customers?.full_name 
            ? call.customers.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
            : 'UC'
        },
        status: call.status,
        direction: call.direction,
        duration: call.duration_seconds,
        endedAt: call.ended_at,
        agentPhone: call.agent_phone,
        metadata: call.metadata,
        rawCall: call
      }));
    } else if (type === 'callbacks') {
      return data.map(callback => ({
        id: callback.id,
        type: 'callback',
        subject: callback.customer_phone || 'Unknown Number',
        preview: `Callback request • ${callback.status}`,
        customer: {
          phone: callback.customer_phone || 'Unknown',
          initials: 'UC'
        },
        status: callback.status,
        requestedAt: callback.created_at,
        metadata: callback.metadata
      }));
    } else if (type === 'voicemails') {
      return data.map(voicemail => {
        // Extract phone from available fields (priority order)
        const phone = voicemail.customer_phone || 
                      voicemail.calls?.customer_phone || 
                      voicemail.event_data?.customer_phone || 
                      'Unknown Number';
        
        return {
          id: voicemail.id,
          type: 'voicemail',
          subject: phone,
          preview: `Voicemail • ${voicemail.status}`,
          customer: {
            phone: phone,
            initials: phone !== 'Unknown Number' ? phone.substring(0, 2).toUpperCase() : 'UC'
          },
          status: voicemail.status,
          call_id: voicemail.call_id,
          duration: voicemail.event_data?.duration || 0,
          receivedAt: voicemail.created_at,
          metadata: voicemail.event_data || {}
        };
      });
    } else if (type === 'events') {
      return data.map(event => ({
        id: event.id,
        type: 'event',
        subject: event.event_type || 'Event',
        preview: `Call event • ${event.event_type}`,
        timestamp: event.timestamp,
        eventData: event.event_data
      }));
    }
    
    return [];
  }, [getFilteredData]);

  // Find selected entity
  const selectedEntity = conversationId ? 
    entities.find(e => e.id === conversationId) : null;

  const handleRefreshAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['call-events'] });
    queryClient.invalidateQueries({ queryKey: ['voicemails'] });
    queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
    queryClient.invalidateQueries({ queryKey: ['call-notifications'] });
  }, [queryClient]);

  const handleEntitySelect = useCallback((entity: any) => {
    navigation.navigateToConversation(entity.id);
  }, [navigation]);

  const handleBack = useCallback(() => {
    navigation.clearConversation();
  }, [navigation]);

  const handleSectionChange = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
    navigation.navigateToInbox(sectionId);
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

  // Entity transformation helpers
  const transformCallToEntity = (call: any) => ({
    id: call.id,
    type: 'call' as const,
    subject: formatPhoneNumber(call.customer_phone),
    preview: `${call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call • ${call.status}`,
    customer: {
      phone: call.customer_phone || 'Unknown',
      initials: call.customer_phone ? call.customer_phone.substring(0, 2).toUpperCase() : 'UC'
    },
    status: call.status,
    direction: call.direction,
    duration: call.duration_seconds,
    endedAt: call.ended_at,
    receivedAt: call.started_at,
    metadata: call.metadata
  });

  const transformCallbackToEntity = (callback: any) => ({
    id: callback.id,
    type: 'callback' as const,
    subject: formatPhoneNumber(callback.customer_phone),
    preview: `Callback request • ${callback.status}`,
    customer: {
      phone: callback.customer_phone || 'Unknown',
      initials: callback.customer_phone ? callback.customer_phone.substring(0, 2).toUpperCase() : 'UC'
    },
    status: callback.status,
    call_id: callback.call_id,
    receivedAt: callback.created_at,
    metadata: callback.event_data || {}
  });

  const transformVoicemailToEntity = (voicemail: any) => {
    const phone = voicemail.customer_phone || 
                  voicemail.calls?.customer_phone || 
                  voicemail.event_data?.customer_phone || 
                  'Unknown Number';
    
    return {
      id: voicemail.id,
      type: 'voicemail' as const,
      subject: phone,
      preview: `Voicemail • ${voicemail.status}`,
      customer: {
        phone: phone,
        initials: phone !== 'Unknown Number' ? phone.substring(0, 2).toUpperCase() : 'UC'
      },
      status: voicemail.status,
      call_id: voicemail.call_id,
      duration: voicemail.event_data?.duration || 0,
      receivedAt: voicemail.created_at,
      metadata: voicemail.event_data || {}
    };
  };

  // Render sidebar with voice-specific filters
  const renderVoiceSidebar = () => (
    <VoiceSidebar
      selectedSection={selectedSection}
      onSectionChange={handleSectionChange}
    />
  );

  // Render call list
  const renderCallList = () => {
    // For specific sections that need their own filtering components
    if (selectedSection === 'calls-all') {
      return (
        <CallsList
          showTimeFilter={true}
          onNavigateToEvents={(callId) => {
            handleSectionChange('events-log');
            // Additional logic could be added here to filter events by call ID
          }}
          onSelectCall={(call) => handleEntitySelect(transformCallToEntity(call))}
          selectedCallId={conversationId}
        />
      );
    }
    
    if (selectedSection === 'events-log') {
      return (
        <CallEventsList
          events={callEvents}
        />
      );
    }

    // For calls with date filters, use CallsList with date filter
    if (selectedSection === 'calls-today') {
      return (
        <CallsList
          showTimeFilter={false}
          dateFilter="today"
          onNavigateToEvents={(callId) => {
            handleSectionChange('events-log');
          }}
          onSelectCall={(call) => handleEntitySelect(transformCallToEntity(call))}
          selectedCallId={conversationId}
        />
      );
    }
    
    if (selectedSection === 'calls-yesterday') {
      return (
        <CallsList
          showTimeFilter={false}
          dateFilter="yesterday"
          onNavigateToEvents={(callId) => {
            handleSectionChange('events-log');
          }}
          onSelectCall={(call) => handleEntitySelect(transformCallToEntity(call))}
          selectedCallId={conversationId}
        />
      );
    }

    // For callback sections, use CallbackRequestsList
    if (selectedSection.startsWith('callbacks-')) {
      const statusFilter = selectedSection === 'callbacks-pending' ? 'pending' :
                          selectedSection === 'callbacks-assigned' ? 'assigned' :
                          selectedSection === 'callbacks-closed' ? 'closed' : 'all';
      
      return (
        <CallbackRequestsList
          statusFilter={statusFilter}
          onSelectCallback={(callback) => handleEntitySelect(transformCallbackToEntity(callback))}
          selectedCallbackId={conversationId}
        />
      );
    }

    // For voicemail sections, use VoicemailsList
    if (selectedSection.startsWith('voicemails-')) {
      const statusFilter = selectedSection === 'voicemails-pending' ? 'pending' :
                          selectedSection === 'voicemails-assigned' ? 'assigned' :
                          selectedSection === 'voicemails-closed' ? 'closed' : 'all';
      
      return (
        <VoicemailsList
          statusFilter={statusFilter}
          onSelectVoicemail={(voicemail) => handleEntitySelect(transformVoicemailToEntity(voicemail))}
          selectedVoicemailId={conversationId}
        />
      );
    }

    const getSectionTitle = () => {
      switch (selectedSection) {
        case 'ongoing-calls':
          return 'Active Calls';
        default:
          return 'Calls';
      }
    };

    // For ongoing calls, use CallStatusCard with manual end functionality
    if (selectedSection === 'ongoing-calls') {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{getSectionTitle()}</h2>
            <RealTimeIndicator onRefresh={handleRefreshAll} />
          </div>
          
          <div className="space-y-3">
            {activeCalls.map((call) => (
              <CallStatusCard
                key={call.id}
                call={call}
                onViewDetails={(call) => {
                  const entity = {
                    id: call.id,
                    type: 'call' as const,
                    status: call.status,
                    customer: {
                      phone: call.customer_phone || '',
                      initials: 'UC'
                    },
                    agentPhone: call.agent_phone,
                    direction: call.direction,
                    duration: call.duration_seconds,
                    endedAt: call.ended_at,
                    metadata: call.metadata
                  };
                  handleEntitySelect(entity);
                }}
              />
            ))}
            
            {activeCalls.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active calls
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{getSectionTitle()}</h2>
          <RealTimeIndicator onRefresh={handleRefreshAll} />
        </div>
      
      <div className="space-y-2">
        {entities.map((entity) => {
          const renderEntityRow = () => {
            if (entity.type === 'call') {
              return (
                <div
                  key={entity.id}
                  className={`transition-colors ${
                    entity.id === conversationId ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''
                  }`}
                >
                  <EntityListRow
                    subject={formatPhoneNumber(entity.customer.phone)}
                    preview={`${entity.direction === 'inbound' ? 'Incoming' : 'Outgoing'} call • ${entity.status}`}
                    avatar={{
                      fallback: entity.customer.initials,
                      alt: entity.customer.phone
                    }}
                    selected={entity.id === conversationId}
                    onClick={() => handleEntitySelect(entity)}
                    badges={[
                      { 
                        label: entity.direction === 'inbound' ? 'In' : 'Out', 
                        variant: entity.direction === 'inbound' ? 'default' as const : 'secondary' as const 
                      },
                      { label: entity.status, variant: 'outline' as const }
                    ]}
                    meta={[
                      { 
                        label: 'Duration', 
                        value: formatDuration(entity.duration) 
                      },
                      { 
                        label: 'Time', 
                        value: entity.endedAt ? 
                          format(new Date(entity.endedAt), 'HH:mm') : 
                          'Active'
                      },
                      ...(entity.agentPhone ? [{ 
                        label: 'Agent', 
                        value: formatPhoneNumber(entity.agentPhone) 
                      }] : [])
                    ]}
                  />
                </div>
              );
            }
            return null;
          };

          return renderEntityRow();
        })}
        
        {entities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No items found for the selected filter.
          </div>
        )}
      </div>
    </div>
    );
  };

  // Render details
  const renderDetails = () => {
    if (!selectedEntity) return null;

    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-semibold mb-2">
                {selectedEntity.type === 'call' ? 'Call Details' : 
                 selectedEntity.type === 'callback' ? 'Callback Details' :
                 selectedEntity.type === 'voicemail' ? 'Voicemail Details' : 'Event Details'}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {selectedEntity.type === 'call' && (
                  <>
                    <span>{formatPhoneNumber((selectedEntity as any).customer.phone)}</span>
                    <span>•</span>
                    <span>{(selectedEntity as any).direction === 'inbound' ? 'Incoming' : 'Outgoing'}</span>
                    <span>•</span>
                    <span>{formatDuration((selectedEntity as any).duration)}</span>
                  </>
                )}
                {selectedEntity.type === 'callback' && (
                  <>
                    <span>{formatPhoneNumber((selectedEntity as any).customer.phone)}</span>
                    <span>•</span>
                    <span>Callback Request</span>
                    <span>•</span>
                    <span>{(selectedEntity as any).status}</span>
                  </>
                )}
                {selectedEntity.type === 'voicemail' && (
                  <>
                    <span>{formatPhoneNumber((selectedEntity as any).customer.phone)}</span>
                    <span>•</span>
                    <span>Voicemail</span>
                    <span>•</span>
                    <span>{formatDuration((selectedEntity as any).duration)}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="border-t border-border pt-4">
              <h3 className="font-medium mb-2">Information</h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  {/* Status - available for all types except event */}
                  {selectedEntity.type !== 'event' && (
                    <div>
                      <span className="font-medium text-muted-foreground">Status:</span>
                      <span className="ml-2">{(selectedEntity as any).status}</span>
                    </div>
                  )}
                  
                  {/* Direction - only for calls */}
                  {selectedEntity.type === 'call' && (
                    <div>
                      <span className="font-medium text-muted-foreground">Direction:</span>
                      <span className="ml-2">{(selectedEntity as any).direction}</span>
                    </div>
                  )}
                  
                  {/* Ended At - only for calls */}
                  {selectedEntity.type === 'call' && (selectedEntity as any).endedAt && (
                    <div>
                      <span className="font-medium text-muted-foreground">Ended:</span>
                      <span className="ml-2">{format(new Date((selectedEntity as any).endedAt), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                  
                  {/* Requested At - only for callbacks */}
                  {selectedEntity.type === 'callback' && (selectedEntity as any).requestedAt && (
                    <div>
                      <span className="font-medium text-muted-foreground">Requested:</span>
                      <span className="ml-2">{format(new Date((selectedEntity as any).requestedAt), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                  
                  {/* Received At - only for voicemails */}
                  {selectedEntity.type === 'voicemail' && (selectedEntity as any).receivedAt && (
                    <div>
                      <span className="font-medium text-muted-foreground">Received:</span>
                      <span className="ml-2">{format(new Date((selectedEntity as any).receivedAt), 'MMM d, HH:mm')}</span>
                    </div>
                  )}
                  
                  {/* Agent Phone - only for calls */}
                  {selectedEntity.type === 'call' && (selectedEntity as any).agentPhone && (
                    <div>
                      <span className="font-medium text-muted-foreground">Agent:</span>
                      <span className="ml-2">{formatPhoneNumber((selectedEntity as any).agentPhone)}</span>
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

  // Render customer sidebar (always visible)
  const renderCustomerSidebar = () => {
    // Empty state when nothing is selected
    if (!selectedEntity) {
      return (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground mb-1">No Selection</p>
            <p className="text-xs text-muted-foreground">
              Select a call, callback, or voicemail to view customer details
            </p>
          </CardContent>
        </Card>
      );
    }
    
    // For calls, find the full call data
    if (selectedEntity.type === 'call') {
      const call = calls?.find(c => c.id === selectedEntity.id);
      if (!call) {
        return (
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Call data not found</p>
            </CardContent>
          </Card>
        );
      }
      
      return <VoiceCustomerSidebar call={call} />;
    }
    
    // For callbacks/voicemails, derive customer phone
    const customerPhone = 'customer' in selectedEntity ? selectedEntity.customer?.phone : undefined;
    
    if (!customerPhone) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No customer phone available</p>
          </CardContent>
        </Card>
      );
    }
    
    // Try to find linked call for callbacks/voicemails
    const linkedCall = calls?.find(c => {
      const matchesPhone = c.customer_phone === customerPhone;
      const matchesCallId = 'call_id' in selectedEntity && (selectedEntity as any).call_id === c.id;
      return matchesPhone || matchesCallId;
    });
    
    return (
      <VoiceCustomerSidebar 
        call={linkedCall}
        customerPhone={customerPhone}
      />
    );
  };

  return (
    <>
      <AircallErrorBoundary>
        <AircallLoginModal
          isOpen={showLoginModal}
          isConnected={isConnected}
          onLoginConfirm={handleManualLoginConfirm}
          onSkip={skipPhoneIntegration}
          initializationPhase={initializationPhase}
          diagnosticIssues={diagnosticIssues}
        />
        
        <AircallBlockedModal
          isOpen={showBlockedModal}
          issues={diagnosticIssues}
          onRetry={forceInitialization}
          onOpenIncognito={openIncognito}
          onSkip={skipPhoneIntegration}
        />
        
        <IncomingCallModal
          call={incomingCall}
          isOpen={isIncomingCallModalOpen}
          onClose={closeIncomingCallModal}
          onAnswerContext={(callId) => {
            closeIncomingCallModal();
            navigation.navigateToConversation(callId);
          }}
        />
        
        <ConnectionDiagnostic 
          isWebSocketBlocked={isWebSocketBlocked}
          isSDKFailed={initializationPhase === 'failed'}
          initializationPhase={initializationPhase}
          onRetry={retryConnection}
          isOptedOut={error?.message?.includes('disabled for this session') || sessionStorage.getItem('aircall_opted_out') === 'true'}
        />
        
        <VoiceLayout
          leftPane={renderVoiceSidebar()}
          centerPane={renderCallList()}
          rightPane={renderCustomerSidebar()}
          leftPaneLabel="Filters"
          centerPaneLabel="Voice Items"
          rightPaneLabel="Customer Info"
        />
        
        {/* Call Details Dialog */}
        <CallDetailsDialog
          call={selectedCall}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
        
        {/* Aircall container moved to App.tsx for global availability */}
        
        {/* Aircall Phone Bar (fixed bottom) */}
        <AircallPhoneBar incomingCall={incomingCall} />
        
        {/* Debug Panel (Phase 5) */}
        <AircallDebugPanel />
      </AircallErrorBoundary>
    </>
  );
};