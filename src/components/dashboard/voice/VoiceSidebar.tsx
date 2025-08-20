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
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalls } from '@/hooks/useCalls';
import { useCallbackRequests } from '@/hooks/useCallbackRequests';
import { useVoicemails } from '@/hooks/useVoicemails';

interface VoiceSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export const VoiceSidebar: React.FC<VoiceSidebarProps> = ({ 
  selectedSection, 
  onSectionChange 
}) => {
  const [expandedSections, setExpandedSections] = useState({
    callbacks: true,
    voicemails: true,
    calls: true,
    events: true
  });

  const { activeCalls, recentCalls } = useCalls();
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
      count: recentCalls?.length || 0 
    },
    { 
      id: 'calls-all', 
      label: 'All Calls', 
      icon: Phone, 
      count: 0 // Will be populated from all calls data
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
          {item.count > 0 && (
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

  return (
    <div className="pane flex flex-col bg-card/90 backdrop-blur-sm shadow-surface">
      <ScrollArea className="flex-1 h-0 min-h-0">
        <div>
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
    </div>
  );
};