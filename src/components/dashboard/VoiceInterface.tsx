import React, { useState } from 'react';
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { RealTimeIndicator } from './voice/RealTimeIndicator';
import { CallNotificationCenter } from './voice/CallNotificationCenter';
import { CallDetailsDialog } from './voice/CallDetailsDialog';
import { CallActionButton } from './voice/CallActionButton';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { useResizablePanels } from '@/hooks/useResizablePanels';

export const VoiceInterface = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  // Panel persistence
  const { getPanelSize, updatePanelSize } = useResizablePanels({
    storageKey: 'voice-interface',
    defaultSizes: {
      sidebar: isMobile ? 100 : isTablet ? 30 : 25,
      content: isMobile ? 100 : isTablet ? 70 : 75
    },
    minSizes: {
      sidebar: isMobile ? 100 : 20,
      content: isMobile ? 100 : 50
    },
    maxSizes: {
      sidebar: isMobile ? 100 : 50,
      content: isMobile ? 100 : 80
    }
  });
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
  const [eventsCallFilter, setEventsCallFilter] = useState<string | null>(null);

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['calls'] });
    queryClient.invalidateQueries({ queryKey: ['call-events'] });
    queryClient.invalidateQueries({ queryKey: ['voicemails'] });
    queryClient.invalidateQueries({ queryKey: ['callback-requests'] });
    queryClient.invalidateQueries({ queryKey: ['call-notifications'] });
  };

  const navigateToCall = (callId: string) => {
    // Navigate to specific call - you can expand this based on your needs
    setSelectedSection('calls-today');
    setSelectedCall(calls.find(call => call.id === callId));
  };

  const navigateToCallEvents = (callId: string) => {
    setEventsCallFilter(callId);
    setSelectedSection('events-log');
  };

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

  const getFilterFromSection = (section: string) => {
    if (section.startsWith('callbacks-')) {
      const status = section.replace('callbacks-', '');
      if (status === 'all') return undefined;
      // Map UI terms to database terms
      if (status === 'closed') return 'completed';
      if (status === 'assigned') return 'processed';
      return status;
    }
    if (section.startsWith('voicemails-')) {
      const status = section.replace('voicemails-', '');
      if (status === 'all') return undefined;
      // Map UI terms to database terms for voicemails
      if (status === 'closed') return 'completed';
      if (status === 'assigned') return 'processed';
      return status;
    }
    return undefined;
  };

  const getSectionTitle = (section: string) => {
    const titles = {
      'ongoing-calls': 'Active Calls',
      'callbacks-pending': 'Pending Callback Requests',
      'callbacks-assigned': 'Assigned Callback Requests', 
      'callbacks-closed': 'Completed Callback Requests',
      'callbacks-all': 'All Callback Requests',
      'voicemails-pending': 'Pending Voicemails',
      'voicemails-assigned': 'Assigned Voicemails',
      'voicemails-closed': 'Completed Voicemails', 
      'voicemails-all': 'All Voicemails',
      'calls-today': 'Today\'s Calls',
      'calls-yesterday': 'Yesterday\'s Calls',
      'calls-all': 'All Calls',
      'events-log': 'Call Events Log'
    };
    return titles[section] || 'Voice Monitor';
  };

  const renderMainContent = () => {
    const sectionTitle = getSectionTitle(selectedSection);
    const filter = getFilterFromSection(selectedSection);

    switch (selectedSection) {
      case 'ongoing-calls':
        const recentlyEndedCalls = calls.filter(call => {
          if (call.status !== 'completed' || !call.ended_at || !call.agent_phone) return false;
          const endTime = new Date(call.ended_at);
          const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
          return endTime >= tenMinutesAgo;
        });

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">{sectionTitle}</h1>
              <RealTimeIndicator onRefresh={handleRefreshAll} />
            </div>
            
            {/* Active Calls Section */}
            <div className="space-y-4">
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

            {/* Recently Ended Calls Section */}
            {recentlyEndedCalls.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-medium">Recently Ended Calls</h2>
                  <span className="text-sm text-muted-foreground">
                    (Last 10 minutes - Add notes)
                  </span>
                </div>
                <div className="space-y-1">
                  {recentlyEndedCalls.map((call) => {
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

                    const getDirectionIcon = (direction: string) => {
                      return direction === 'inbound' ? 
                        <ArrowDownLeft className="h-4 w-4 text-blue-600" /> : 
                        <ArrowUpRight className="h-4 w-4 text-green-600" />;
                    };

                    return (
                      <Card key={call.id} className="transition-all duration-200 hover:shadow-md">
                        <CardContent className="px-2 py-1">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-1.5 flex-1">
                              <div className="flex-shrink-0 mt-0.5">
                                {getDirectionIcon(call.direction)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="font-medium text-sm">
                                    {formatPhoneNumber(call.customer_phone)}
                                  </span>
                                  {(() => {
                                    const getRecentCallStatusDetails = (call: any) => {
                                      const metadata = call.metadata || {};
                                      if (metadata.missReason || metadata.miss_reason) {
                                        return {
                                          variant: 'destructive' as const,
                                          label: 'Missed',
                                          reason: metadata.missReason || metadata.miss_reason
                                        };
                                      }
                                      if (metadata.voicemailDuration || metadata.duration) {
                                        return {
                                          variant: 'secondary' as const,
                                          label: 'Voicemail Left',
                                          reason: `${metadata.voicemailDuration || metadata.duration}s`
                                        };
                                      }
                                      return {
                                        variant: 'default' as const,
                                        label: 'Completed',
                                        reason: null
                                      };
                                    };
                                    
                                    const statusDetails = getRecentCallStatusDetails(call);
                                    return (
                                      <Badge 
                                        variant={statusDetails.variant} 
                                        className="text-xs px-1 py-0 h-4"
                                        title={statusDetails.reason || undefined}
                                      >
                                        {statusDetails.label}
                                        {statusDetails.reason && <span className="ml-1">({statusDetails.reason})</span>}
                                      </Badge>
                                    );
                                  })()}
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-0.5">
                                    <Calendar className="h-3 w-3" />
                                    <span>{format(new Date(call.ended_at!), 'MMM d, HH:mm')}</span>
                                  </div>
                                  <div className="flex items-center gap-0.5">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDuration(call.duration_seconds)}</span>
                                  </div>
                                  {call.agent_phone && (
                                    <div className="flex items-center gap-0.5">
                                      <User className="h-3 w-3" />
                                      <span>{formatPhoneNumber(call.agent_phone)}</span>
                                    </div>
                                  )}
                                </div>
                                
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Ended {formatDistanceToNow(new Date(call.ended_at!), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <CallActionButton
                                phoneNumber={call.customer_phone}
                                size="sm"
                                className="h-6 px-2 text-xs"
                              />
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedCall(call);
                                  setIsDetailsOpen(true);
                                }}
                                className="flex items-center gap-1 h-6 px-2 text-xs"
                                title="Add call notes"
                              >
                                <MessageSquare className="h-3 w-3" />
                                Add Notes
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'callbacks-pending':
      case 'callbacks-assigned':
      case 'callbacks-closed':
      case 'callbacks-all':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">{sectionTitle}</h1>
            </div>
            <CallbackRequestsList statusFilter={filter} />
          </div>
        );

      case 'voicemails-pending':
      case 'voicemails-assigned':
      case 'voicemails-closed':
      case 'voicemails-all':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">{sectionTitle}</h1>
            </div>
            <VoicemailsList statusFilter={filter} />
          </div>
        );

      case 'calls-today':
      case 'calls-yesterday':
      case 'calls-all':
        const dateFilter = selectedSection === 'calls-today' ? 'today' : 
                          selectedSection === 'calls-yesterday' ? 'yesterday' : 
                          undefined;
        
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">{sectionTitle}</h1>
            </div>
            <CallsList 
              showTimeFilter={selectedSection === 'calls-all'} 
              dateFilter={dateFilter}
              onNavigateToEvents={navigateToCallEvents} 
            />
          </div>
        );

      case 'events-log':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">{sectionTitle}</h1>
              <RealTimeIndicator onRefresh={handleRefreshAll} />
            </div>
            <CallEventsList events={callEvents} callFilter={eventsCallFilter} />
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a section from the sidebar</p>
            </div>
          </div>
        );
    }
  };

  // Responsive resizing settings
  const enableResizing = isDesktop || isTablet;

  if (isMobile) {
    // Mobile: Show only sidebar initially, then content
    return (
      <div className="app-root bg-gradient-surface flex flex-col h-screen">
        {/* Header */}
        <div className="app-header flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface flex-shrink-0">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Phone className="h-6 w-6" />
              Call Monitor
            </h2>
            <p className="text-muted-foreground">
              Real-time call events and monitoring
            </p>
          </div>
          
          {/* Notification Center */}
          <CallNotificationCenter onNavigateToCall={navigateToCall} />
        </div>
        
        {/* Main Content */}
        <div className="app-main bg-gradient-surface flex-1 min-h-0">
          {selectedSection === 'nav' ? (
            <div className="nav-pane border-r border-border bg-card/80 backdrop-blur-sm shadow-surface h-full">
              <VoiceSidebar 
                selectedSection={selectedSection}
                onSectionChange={setSelectedSection}
              />
            </div>
          ) : (
            <div className="detail-pane flex flex-col bg-gradient-surface h-full">
              <div className="pane flex-1 min-h-0">
                <div className="p-6">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedSection('nav')}
                    className="mb-4"
                  >
                    ← Back to Navigation
                  </Button>
                  {renderMainContent()}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Call Details Dialog */}
        <CallDetailsDialog
          call={selectedCall}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="app-root bg-gradient-surface flex flex-col h-screen">
      {/* Header */}
      <div className="app-header flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface flex-shrink-0">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Phone className="h-6 w-6" />
            Call Monitor
          </h2>
          <p className="text-muted-foreground">
            Real-time call events and monitoring
          </p>
        </div>
        
        {/* Notification Center */}
        <CallNotificationCenter onNavigateToCall={navigateToCall} />
      </div>
      
      {/* Main Content */}
      <div className="app-main bg-gradient-surface flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Sidebar Panel */}
          <ResizablePanel 
            defaultSize={getPanelSize('sidebar')}
            minSize={getPanelSize('sidebar') < 100 ? 20 : 100}
            maxSize={getPanelSize('sidebar') < 100 ? 50 : 100}
            onResize={(size) => updatePanelSize('sidebar', size)}
            className="border-r border-border bg-card/80 backdrop-blur-sm shadow-surface"
          >
            <VoiceSidebar 
              selectedSection={selectedSection}
              onSectionChange={setSelectedSection}
            />
          </ResizablePanel>

          {enableResizing && <ResizableHandle withHandle />}

          {/* Content Panel */}
          <ResizablePanel className="flex flex-col bg-gradient-surface" minSize={50}>
            <div className="pane flex-1 min-h-0">
              <div className="p-6">
                {renderMainContent()}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      
      {/* Call Details Dialog */}
      <CallDetailsDialog
        call={selectedCall}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
};