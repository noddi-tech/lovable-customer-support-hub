import React, { useState, useMemo } from 'react';
import { Phone, ArrowUpRight, ArrowDownLeft, Clock, User, Filter, MessageSquare, Calendar, Building2, History, PhoneCall, CheckCircle2, AlertCircle, Table as TableIcon, LayoutGrid } from 'lucide-react';
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
import { formatPhoneNumber, normalizePhoneNumber } from '@/utils/phoneNumberUtils';
import { getMonitoredPhoneForCall } from '@/utils/phoneNumberUtils';
import { EnhancedCallCard } from './EnhancedCallCard';
import { AdvancedCallFilters, CallFilters } from './AdvancedCallFilters';
import { BadgeGuide } from './BadgeGuide';
import { CallsTable } from './CallsTable';

interface CallsListProps {
  showTimeFilter?: boolean;
  dateFilter?: 'today' | 'yesterday';
  onNavigateToEvents?: (callId: string) => void;
  onSelectCall?: (call: any) => void;
  selectedCallId?: string;
}


export const CallsList = ({ showTimeFilter = true, dateFilter, onNavigateToEvents, onSelectCall, selectedCallId }: CallsListProps) => {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [timeRangeStart, setTimeRangeStart] = useState<Date | null>(null);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  // Advanced filters state
  const [filters, setFilters] = useState<CallFilters>({
    search: '',
    status: [],
    timeRange: 'all',
    duration: '',
    priority: [],
  });
  
  const { calls, isLoading, error, removeCall } = useCalls();
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

  // Filter calls based on all filters including advanced search
  const filteredCalls = calls.filter(call => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const normalizedSearch = normalizePhoneNumber(filters.search);
      
      const matchesPhone = call.customer_phone && (
        call.customer_phone.toLowerCase().includes(searchLower) ||
        normalizePhoneNumber(call.customer_phone).includes(normalizedSearch)
      );
      const matchesName = call.customers?.full_name?.toLowerCase().includes(searchLower);
      const matchesId = call.id?.toLowerCase().includes(searchLower);
      if (!matchesPhone && !matchesName && !matchesId) return false;
    }
    
    // Status filters from advanced filters
    if (filters.status.length > 0) {
      const matchesStatus = filters.status.some(s => {
        if (s === 'missed') return call.status === 'missed' || call.end_reason === 'not_answered';
        if (s === 'completed') return call.status === 'completed' || call.status === 'answered';
        if (s === 'ongoing') return call.status === 'ringing' || call.status === 'on_hold';
        return false;
      });
      if (!matchesStatus) return false;
    }
    
    // Legacy status filter (for backward compatibility)
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

  // Component to render a call card with notes
  const CallCardWithNotes = ({ call }: { call: any }) => {
    const { notes } = useCallNotes(call.id);
    const notesCount = notes?.length || 0;

    return (
      <EnhancedCallCard
        call={call}
        isSelected={selectedCallId === call.id}
        onViewDetails={openCallDetails}
        onNavigateToEvents={onNavigateToEvents}
        onRemoveCall={removeCall}
        notesCount={notesCount}
      />
    );
  };

  // Convert renderGroup to a proper component to fix React hooks rule violation
  const CallGroup = ({ title, calls, icon, defaultOpen = true }: { 
    title: string; 
    calls: typeof filteredCalls; 
    icon: React.ReactNode; 
    defaultOpen?: boolean;
  }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    if (calls.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full text-left px-2 py-1 hover:bg-muted/50 rounded-md"
        >
          {icon}
          <span className="font-semibold text-sm">{title}</span>
          <Badge variant="secondary" className="ml-auto">
            {calls.length}
          </Badge>
        </button>
        {isOpen && (
          <div className="space-y-2">
            {calls.map(call => (
              <CallCardWithNotes key={call.id} call={call} />
            ))}
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
      {/* Advanced Search and Filters */}
      <AdvancedCallFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={() => setFilters({
          search: '',
          status: [],
          timeRange: 'all',
          duration: '',
          priority: [],
        })}
      />
      
      {/* Badge Guide */}
      <BadgeGuide />
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call History</h3>
          <p className="text-sm text-muted-foreground">
            {filteredCalls.length} call{filteredCalls.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        {/* View Mode Toggle & Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-md">
            <Button 
              variant={viewMode === 'table' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('table')}
              className="rounded-r-none"
            >
              <TableIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === 'cards' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('cards')}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
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
      ) : viewMode === 'table' ? (
        <CallsTable
          calls={filteredCalls}
          onCallClick={openCallDetails}
          selectedCallId={selectedCallId}
          onRemoveCall={removeCall}
          onNavigateToEvents={onNavigateToEvents}
        />
      ) : (
        <div className="space-y-6">
          <CallGroup
            title="Active Calls"
            calls={groupedCalls.active}
            icon={<PhoneCall className="h-4 w-4 text-success animate-pulse" />}
            defaultOpen={true}
          />
          <CallGroup
            title="Urgent"
            calls={groupedCalls.urgent}
            icon={<AlertCircle className="h-4 w-4 text-destructive" />}
            defaultOpen={true}
          />
          <CallGroup
            title="Recent (Today)"
            calls={groupedCalls.recent}
            icon={<Clock className="h-4 w-4 text-primary" />}
            defaultOpen={true}
          />
          <CallGroup
            title="Earlier"
            calls={groupedCalls.earlier}
            icon={<History className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={false}
          />
        </div>
      )}

      {/* Call Details Dialog */}
      <CallDetailsDialog
        call={selectedCall}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onNavigateToEvents={(call) => onNavigateToEvents?.(call.id)}
        onRemoveCall={removeCall}
      />
    </div>
  );
};