import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from '@/components/ui/separator';
import { 
  Phone,
  PhoneCall,
  PhoneIncoming,
  Voicemail,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  Activity,
  Settings,
  Filter,
  AlertCircle,
  MessageSquare,
  Search,
  MoreVertical
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCalls } from '@/hooks/useCalls';
import { useCallbackRequests } from '@/hooks/useCallbackRequests';
import { useVoicemails } from '@/hooks/useVoicemails';
import { useVoice } from '@/contexts/VoiceContext';
import { CallListView } from './CallListView';

interface VoiceSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export const VoiceSidebar: React.FC<VoiceSidebarProps> = ({ 
  selectedSection, 
  onSectionChange 
}) => {
  const { state, setFilters } = useVoice();
  const [expandedSections, setExpandedSections] = useState({
    callbacks: true,
    voicemails: true,
    calls: true,
    events: true
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { activeCalls, calls, isLoading } = useCalls();
  const { 
    pendingRequests, 
    processedRequests, 
    completedRequests,
    callbackRequests 
  } = useCallbackRequests();
  const { 
    voicemails,
    voicemailsWithRecordings,
    transcribedVoicemails 
  } = useVoicemails();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ searchQuery: query });
  };

  const getFilteredCalls = () => {
    if (!calls) return [];
    
    let filtered = calls;
    
    // Apply section filter
    switch (selectedSection) {
      case 'ongoing-calls':
        filtered = activeCalls || [];
        break;
      case 'calls-today':
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        filtered = calls.filter(call => {
          const callDate = new Date(call.started_at);
          return callDate >= todayStart && callDate < todayEnd;
        });
        break;
      case 'calls-yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
        const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1);
        filtered = calls.filter(call => {
          const callDate = new Date(call.started_at);
          return callDate >= yesterdayStart && callDate < yesterdayEnd;
        });
        break;
      case 'calls-all':
      default:
        filtered = calls;
        break;
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(call => 
        call.customer_phone?.includes(searchQuery) ||
        call.agent_phone?.includes(searchQuery) ||
        call.external_id?.includes(searchQuery)
      );
    }
    
    return filtered;
  };
  const getCallsCountByDate = (dateFilter: 'today' | 'yesterday' | 'all') => {
    if (dateFilter === 'all') return calls?.length || 0;
    
    if (!calls) return 0;
    
    return calls.filter(call => {
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
        return callDate >= todayStart && callDate < todayEnd;
      } else if (dateFilter === 'yesterday') {
        return callDate >= yesterdayStart && callDate < yesterdayEnd;
      }
      
      return false;
    }).length;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const ongoingCallsItems = [
    { 
      id: 'ongoing-calls', 
      label: 'Active Calls', 
      icon: PhoneCall, 
      count: activeCalls?.length || 0 
    }
  ];

  const callbackItems = [
    { 
      id: 'callbacks-pending', 
      label: 'Pending', 
      icon: AlertCircle, 
      count: pendingRequests?.length || 0,
      color: 'text-orange-500'
    },
    { 
      id: 'callbacks-assigned', 
      label: 'Assigned', 
      icon: Users, 
      count: processedRequests?.length || 0,
      color: 'text-blue-500'
    },
    { 
      id: 'callbacks-closed', 
      label: 'Closed', 
      icon: CheckCircle, 
      count: completedRequests?.length || 0,
      color: 'text-green-500'
    },
    { 
      id: 'callbacks-all', 
      label: 'All', 
      icon: MessageSquare, 
      count: callbackRequests?.length || 0 
    }
  ];

  const voicemailItems = [
    { 
      id: 'voicemails-pending', 
      label: 'Pending', 
      icon: AlertCircle, 
      count: voicemails?.filter(vm => vm.status === 'pending').length || 0,
      color: 'text-orange-500'
    },
    { 
      id: 'voicemails-assigned', 
      label: 'Assigned', 
      icon: Users, 
      count: voicemails?.filter(vm => vm.status === 'assigned').length || 0,
      color: 'text-blue-500'
    },
    { 
      id: 'voicemails-closed', 
      label: 'Closed', 
      icon: CheckCircle, 
      count: voicemails?.filter(vm => vm.status === 'closed').length || 0,
      color: 'text-green-500'
    },
    { 
      id: 'voicemails-all', 
      label: 'All', 
      icon: Voicemail, 
      count: voicemails?.length || 0 
    }
  ];

  const callsItems = [
    { 
      id: 'calls-today', 
      label: 'Today\'s Calls', 
      icon: Calendar, 
      count: getCallsCountByDate('today')
    },
    { 
      id: 'calls-yesterday', 
      label: 'Yesterday\'s Calls', 
      icon: Clock, 
      count: getCallsCountByDate('yesterday')
    },
    { 
      id: 'calls-all', 
      label: 'All Calls', 
      icon: Phone, 
      count: getCallsCountByDate('all')
    }
  ];

  const eventsItems = [
    { 
      id: 'events-log', 
      label: 'Call Events Log', 
      icon: Activity, 
      count: 0 // TODO: Get from call events
    }
  ];

  const renderSidebarItems = (items: any[], sectionId: string) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isSelected = selectedSection === item.id;
      const showCount = item.count > 0 && !item.id.includes('-all');
      
      return (
        <Button
          key={item.id}
          variant="ghost"
          className={cn(
            "w-full justify-start px-2 py-2 h-auto font-normal",
            isSelected ? "bg-inbox-selected text-inbox-unread" : "text-foreground hover:bg-inbox-hover"
          )}
          onClick={() => onSectionChange(item.id)}
        >
          <Icon className={cn("mr-3 h-4 w-4", item.color)} />
          <span className="flex-1 text-left">{item.label}</span>
          {showCount && (
            <Badge 
              variant={isSelected ? "default" : "secondary"} 
              className="ml-auto h-5 text-xs"
            >
              {item.count}
            </Badge>
          )}
        </Button>
      );
    });
  };

  // Show call list for call-related sections
  const shouldShowCallList = selectedSection.startsWith('calls-') || selectedSection === 'ongoing-calls';
  
  return (
    <div className="pane flex flex-col bg-card/90 backdrop-blur-sm shadow-surface h-full">
      {shouldShowCallList ? (
        // Call List View
        <div className="flex flex-col h-full">
          {/* Search Header */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calls..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>
          </div>
          
          {/* Call List */}
          <div className="flex-1 min-h-0">
            <CallListView 
              calls={getFilteredCalls()} 
              isLoading={isLoading}
            />
          </div>
        </div>
      ) : (
        // Navigation Sidebar
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2">
          {/* Ongoing Calls */}
          <div className="px-2 pt-4">
            <div className="flex items-center justify-between px-2 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Ongoing Calls</h3>
            </div>
            
            <div className="space-y-1">
              {renderSidebarItems(ongoingCallsItems, 'ongoing')}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Callback Requests */}
          <div className="px-2">
            <div className="flex items-center justify-between px-2 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Callback Requests</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => toggleSection('callbacks')}
              >
                <Filter className="h-3 w-3" />
              </Button>
            </div>
            
            {expandedSections.callbacks && (
              <div className="space-y-1">
                {renderSidebarItems(callbackItems, 'callbacks')}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Voicemails */}
          <div className="px-2">
            <div className="flex items-center justify-between px-2 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Voicemails</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => toggleSection('voicemails')}
              >
                <Filter className="h-3 w-3" />
              </Button>
            </div>
            
            {expandedSections.voicemails && (
              <div className="space-y-1">
                {renderSidebarItems(voicemailItems, 'voicemails')}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Calls */}
          <div className="px-2">
            <div className="flex items-center justify-between px-2 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Calls</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => toggleSection('calls')}
              >
                <Filter className="h-3 w-3" />
              </Button>
            </div>
            
            {expandedSections.calls && (
              <div className="space-y-1">
                {renderSidebarItems(callsItems, 'calls')}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Events */}
          <div className="px-2 pb-4">
            <div className="flex items-center justify-between px-2 py-2">
              <h3 className="text-sm font-medium text-muted-foreground">Events</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={() => toggleSection('events')}
              >
                <Filter className="h-3 w-3" />
              </Button>
            </div>
            
            {expandedSections.events && (
              <div className="space-y-1">
                {renderSidebarItems(eventsItems, 'events')}
              </div>
            )}
            
            <div className="px-2 py-2 text-xs text-muted-foreground italic">
              Configuration moved to Settings → Admin → Integrations → Voice
            </div>
          </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
};