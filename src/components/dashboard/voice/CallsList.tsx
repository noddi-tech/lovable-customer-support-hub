import React, { useState, useMemo } from 'react';
import { Phone, ArrowUpRight, ArrowDownLeft, Clock, User, Filter, MessageSquare, Calendar, Building2, History, PhoneCall, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TimeRangeFilter } from '@/components/ui/timerange-filter';
import { SidebarCounter } from '@/components/ui/sidebar-counter';
import { useCalls } from '@/hooks/useCalls';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { useCallNotes } from '@/hooks/useCallNotes';
import { formatDistanceToNow, format, isAfter } from 'date-fns';
import { CallDetailsDialog } from './CallDetailsDialog';
import { CallActionButton } from './CallActionButton';
import { getMonitoredPhoneForCall } from '@/utils/phoneNumberUtils';
import { EnhancedCallCard } from './EnhancedCallCard';

interface CallsListProps {
  showTimeFilter?: boolean;
  dateFilter?: 'today' | 'yesterday';
  onNavigateToEvents?: (callId: string) => void;
  onSelectCall?: (call: any) => void;
  selectedCallId?: string;
}

// Component to get notes count for a call
const CallNotesCount = ({ callId }: { callId: string }) => {
  const { notes } = useCallNotes(callId);
  const notesCount = notes?.length || 0;
  
  return notesCount > 0 ? (
    <SidebarCounter 
      count={notesCount} 
      variant="default" 
      className="ml-1" 
    />
  ) : null;
};

export const CallsList = ({ showTimeFilter = true, dateFilter, onNavigateToEvents, onSelectCall, selectedCallId }: CallsListProps) => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [timeRangeStart, setTimeRangeStart] = useState<Date | null>(null);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  const { calls, isLoading, error } = useCalls();
  const { getIntegrationByProvider } = useVoiceIntegrations();
  const aircallIntegration = getIntegrationByProvider('aircall');

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Calls</CardTitle>
          <CardDescription>
            Failed to load calls. Please try again.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Filter calls based on status, direction, and time range
  const filteredCalls = calls.filter(call => {
    if (statusFilter !== 'all' && call.status !== statusFilter) return false;
    if (directionFilter !== 'all' && call.direction !== directionFilter) return false;
    
    // Handle specific date filters (today/yesterday)
    if (dateFilter) {
      const callDate = new Date(call.started_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Set times to start of day for accurate comparison
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
      
      if (dateFilter === 'today') {
        if (callDate < todayStart || callDate >= todayEnd) return false;
      } else if (dateFilter === 'yesterday') {
        if (callDate < yesterdayStart || callDate >= yesterdayEnd) return false;
      }
    }
    // Filter calls based on time range filter (for "All Calls" section)
    else if (showTimeFilter && timeRangeStart) {
      const callDate = new Date(call.started_at);
      if (!isAfter(callDate, timeRangeStart)) return false;
    }
    
    return true;
  });

  // Smart grouping: Urgent, Active, Recent, Earlier
  const groupedCalls = useMemo(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const urgent: typeof filteredCalls = [];
    const active: typeof filteredCalls = [];
    const recent: typeof filteredCalls = [];
    const earlier: typeof filteredCalls = [];
    
    filteredCalls.forEach(call => {
      const callDate = new Date(call.started_at);
      
      // Active calls
      if (call.status === 'ringing' || call.status === 'on_hold') {
        active.push(call);
      }
      // Urgent: missed calls < 1 hour old
      else if ((call.status === 'missed' || call.end_reason === 'not_answered') && callDate > oneHourAgo) {
        urgent.push(call);
      }
      // Recent: calls from today
      else if (callDate >= todayStart) {
        recent.push(call);
      }
      // Earlier: older calls
      else {
        earlier.push(call);
      }
    });
    
    return { urgent, active, recent, earlier };
  }, [filteredCalls]);

  const callsTimeRangePresets = [
    { id: '24h', label: 'Last 24 Hours', hours: 24 },
    { id: '1w', label: 'Last Week', weeks: 1 }
  ];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'answered':
        return 'success';
      case 'ringing':
        return 'warning';
      case 'missed':
        return 'destructive';
      case 'busy':
        return 'destructive';
      case 'failed':
        return 'destructive';
      case 'voicemail':
        return 'secondary';
      case 'transferred':
        return 'default';
      case 'on_hold':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getStatusDetails = (call: any) => {
    const endReason = call.end_reason;
    const availability = call.availability_status;
    const ivrInteraction = call.ivr_interaction || [];
    const enrichedDetails = call.enriched_details || {};
    
    // Check for IVR interactions
    const hasCallbackRequest = Array.isArray(ivrInteraction) && 
      ivrInteraction.some((option: any) => option.branch === 'callback_requested');
    
    // Determine status based on enriched data
    switch (endReason) {
      case 'abandoned_in_ivr':
        if (hasCallbackRequest) {
          return {
            label: 'Callback Requested',
            description: 'Customer requested callback via IVR',
            icon: '📞➡️'
          };
        }
        return {
          label: 'Abandoned in IVR',
          description: 'Customer hung up during IVR menu',
          icon: '📞❌'
        };
      
      case 'hung_up':
        return {
          label: 'Hung Up',
          description: 'Call was terminated by customer',
          icon: '📞⬇️'
        };
      
      case 'completed_normally':
        const agentName = enrichedDetails.user_name;
        return {
          label: 'Completed',
          description: agentName ? `Handled by ${agentName}` : 'Call completed successfully',
          icon: '✅'
        };
      
      case 'not_answered':
        if (availability === 'closed') {
          return {
            label: 'Outside Hours',
            description: 'Call received outside business hours',
            icon: '🕐❌'
          };
        }
        return {
          label: 'Not Answered',
          description: 'No agent available to answer',
          icon: '📞❌'
        };
      
      // Fallback to original logic for older records
      case null:
      case undefined:
        switch (call.status) {
          case 'missed':
            const missReason = call.metadata?.missReason || call.metadata?.miss_reason;
            return {
              label: 'Missed',
              description: missReason || 'Customer did not answer',
              icon: '📞❌'
            };
          case 'busy':
            return {
              label: 'Busy',
              description: 'Line was busy',
              icon: '📞🔴'
            };
          case 'failed':
            const failReason = call.metadata?.failReason || call.metadata?.error || 'Technical issue';
            return {
              label: 'Failed',
              description: `Failed: ${failReason}`,
              icon: '❌'
            };
          case 'voicemail':
            const vmDuration = call.metadata?.voicemailDuration || call.metadata?.duration;
            return {
              label: 'Voicemail',
              description: vmDuration ? `Voicemail left (${vmDuration}s)` : 'Voicemail left',
              icon: '📧'
            };
          case 'transferred':
            const transferTo = call.metadata?.transferredTo || call.metadata?.transfer_to;
            return {
              label: 'Transferred',
              description: transferTo ? `Transferred to ${transferTo}` : 'Call transferred',
              icon: '↗️'
            };
          case 'answered':
            return {
              label: 'Answered',
              description: 'Call was answered',
              icon: '✅'
            };
          case 'completed':
            return {
              label: 'Completed',
              description: 'Call completed successfully',
              icon: '✅'
            };
          case 'on_hold':
            return {
              label: 'On Hold',
              description: 'Call is on hold',
              icon: '⏸️'
            };
          case 'ringing':
            return {
              label: 'Ringing',
              description: 'Currently ringing',
              icon: '📞'
            };
          default:
            return {
              label: call.status?.charAt(0).toUpperCase() + call.status?.slice(1) || 'Unknown',
              description: `Status: ${call.status}`,
              icon: '📞'
            };
        }
      
      default:
        return {
          label: endReason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: `Call ended: ${endReason.replace(/_/g, ' ')}`,
          icon: '📞'
        };
    }
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? 
      <ArrowDownLeft className="h-4 w-4" /> : 
      <ArrowUpRight className="h-4 w-4" />;
  };

  const getBorderColor = (call: any) => {
    // Missed/urgent = red, completed = green, pending/callback = yellow
    if (call.status === 'missed' || call.end_reason === 'not_answered') return 'border-l-destructive';
    if (call.status === 'completed' || call.status === 'answered') return 'border-l-success';
    if (call.status === 'ringing' || call.status === 'on_hold') return 'border-l-warning';
    return 'border-l-muted';
  };

  const getCallAge = (startedAt: string) => {
    const now = new Date();
    const callDate = new Date(startedAt);
    const diffHours = (now.getTime() - callDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > 24) return 'opacity-60';
    if (diffHours > 12) return 'opacity-75';
    if (diffHours > 6) return 'opacity-85';
    return 'opacity-100';
  };

  const renderCallCard = (call: any) => (
    <Card 
      key={call.id} 
      className={`group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 border-l-4 ${getBorderColor(call)} ${getCallAge(call.started_at)} ${
        selectedCallId === call.id ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, select')) {
          return;
        }
        onSelectCall?.(call);
      }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Direction Icon */}
            <div className="flex-shrink-0 mt-1 p-2 rounded-full bg-muted">
              {getDirectionIcon(call.direction)}
            </div>
            
            {/* Call Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-lg truncate" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                  {formatPhoneNumber(call.customer_phone)}
                </span>
                {(() => {
                  const statusDetails = getStatusDetails(call);
                  return (
                    <Badge 
                      variant={getStatusColor(call.status) as any} 
                      className="text-xs shrink-0"
                    >
                      {statusDetails.label}
                    </Badge>
                  );
                })()}
              </div>
              
              {/* Customer Name if available */}
              {call.customer?.full_name && (
                <div className="text-sm text-foreground font-medium mb-1">
                  {call.customer.full_name}
                </div>
              )}
              
              {/* Status Description */}
              {(() => {
                const statusDetails = getStatusDetails(call);
                const hasAdditionalInfo = statusDetails.description && statusDetails.description !== `Status: ${call.status}`;
                
                return hasAdditionalInfo && (
                  <div className="text-sm text-muted-foreground mb-2">
                    {statusDetails.description}
                  </div>
                );
              })()}
              
              {/* Metadata Row */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}</span>
                </div>
                {call.duration_seconds > 0 && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{formatDuration(call.duration_seconds)}</span>
                  </div>
                )}
                <CallNotesCount callId={call.id} />
              </div>
            </div>
          </div>

          {/* Quick Actions - Show on Hover */}
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                openCallDetails(call);
              }}
              title="View Details"
            >
              <History className="h-4 w-4" />
            </Button>
            {onNavigateToEvents && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigateToEvents(call.id);
                }}
                title="View Events"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderGroup = (title: string, calls: typeof filteredCalls, icon: React.ReactNode, defaultOpen = true) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    if (calls.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-muted/50 rounded-md transition-colors"
        >
          {icon}
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="ml-auto">
            {calls.length}
          </Badge>
        </button>
        {isOpen && (
          <div className="space-y-2">
            {calls.map(renderCallCard)}
          </div>
        )}
      </div>
    );
  };

  const openCallDetails = (call: any) => {
    setSelectedCall(call);
    setIsDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call History</h3>
          <p className="text-sm text-muted-foreground">
            Recent calls and their details
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {showTimeFilter && (
            <TimeRangeFilter
              onTimeRangeChange={setTimeRangeStart}
              presets={callsTimeRangePresets}
            />
          )}
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="ringing">Ringing</SelectItem>
              <SelectItem value="answered">Answered</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={directionFilter} onValueChange={setDirectionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calls List */}
      {isLoading ? (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="px-2 py-1">
                <div className="animate-pulse">
                  <div className="h-3 bg-muted rounded w-1/3 mb-1"></div>
                  <div className="h-2 bg-muted rounded w-1/2 mb-1"></div>
                  <div className="h-2 bg-muted rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCalls.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No calls found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter !== 'all' || directionFilter !== 'all' || (showTimeFilter && timeRangeStart)
                ? 'Try adjusting your filters to see more calls'
                : 'Call history will appear here'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {filteredCalls.map((call) => (
            <Card 
              key={call.id} 
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedCallId === call.id ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
              onClick={(e) => {
                // Only trigger selection if clicking the card, not interactive elements
                if ((e.target as HTMLElement).closest('button, select')) {
                  return;
                }
                onSelectCall?.(call);
              }}
            >
              <CardContent className="px-2 py-1">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-1.5 flex-1">
                    {/* Direction Icon */}
                    <div className="flex-shrink-0 flex items-center">
                      {getDirectionIcon(call.direction)}
                    </div>
                    
                    {/* Call Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-medium text-sm">
                          {formatPhoneNumber(call.customer_phone)}
                        </span>
                        {(() => {
                          const statusDetails = getStatusDetails(call);
                          return (
                            <Badge 
                              variant={getStatusColor(call.status) as any} 
                              className="text-xs px-1 py-0 h-4"
                              title={statusDetails.description}
                            >
                              <span className="mr-1">{statusDetails.icon}</span>
                              {statusDetails.label}
                            </Badge>
                          );
                        })()}
                      </div>
                      
                      {/* Status Description & Additional Info */}
                      {(() => {
                        const statusDetails = getStatusDetails(call);
                        const hasAdditionalInfo = statusDetails.description && statusDetails.description !== `Status: ${call.status}`;
                        const availability = call.availability_status;
                        const enrichedDetails = call.enriched_details || {};
                        
                        return (
                          <div className="space-y-1">
                            {hasAdditionalInfo && (
                              <div className="text-xs text-muted-foreground italic">
                                {statusDetails.description}
                              </div>
                            )}
                            
                            {/* Business Hours Indicator */}
                            {availability && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className={`w-2 h-2 rounded-full ${
                                  availability === 'open' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                                <span className="text-muted-foreground">
                                  {availability === 'open' ? 'During business hours' : 'Outside business hours'}
                                </span>
                              </div>
                            )}
                            
                            {/* Agent Information */}
                            {enrichedDetails.user_name && (
                              <div className="text-xs text-muted-foreground">
                                Agent: {enrichedDetails.user_name}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(call.started_at), 'MMM d, HH:mm')}</span>
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
                      
                      {/* Show monitored phone number */}
                      {(() => {
                        const monitoredPhone = getMonitoredPhoneForCall(call, aircallIntegration);
                        if (monitoredPhone) {
                          return (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex items-center gap-0.5 text-xs">
                                <Building2 className="h-3 w-3 text-primary" />
                                <span className="text-primary font-medium">
                                  {monitoredPhone.phoneNumber.label}
                                </span>
                                <span className="text-muted-foreground">
                                  ({monitoredPhone.phoneNumber.number})
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                {monitoredPhone.type === 'company' ? 'Company Line' : 'Agent Line'}
                              </Badge>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                      </p>
                      
                      {/* System ID */}
                      <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
                        ID: {call.id}
                      </p>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <CallActionButton
                      phoneNumber={call.customer_phone}
                      size="sm"
                      className="h-6 px-2 text-xs"
                    />
                    {onNavigateToEvents && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigateToEvents(call.id)}
                        className="flex items-center gap-1 h-6 px-2 text-xs"
                        title="View call events history"
                      >
                        <History className="h-3 w-3" />
                        Events
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCallDetails(call)}
                      className="flex items-center gap-1 h-6 px-2 text-xs"
                      title="View call details and notes"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Notes
                      <CallNotesCount callId={call.id} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Call Details Dialog */}
      <CallDetailsDialog
        call={selectedCall}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </div>
  );
};