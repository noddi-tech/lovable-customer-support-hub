import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  Calendar, 
  User,
  MessageSquare,
  MoreVertical
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useVoice } from '@/contexts/VoiceContext';
import { useCalls } from '@/hooks/useCalls';
import { CallActionButton } from './CallActionButton';
import { cn } from '@/lib/utils';

interface Call {
  id: string;
  customer_phone?: string;
  agent_phone?: string;
  status: string;
  direction: 'inbound' | 'outbound';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  metadata?: any;
}

interface CallListViewProps {
  calls?: Call[];
  isLoading?: boolean;
}

export const CallListView: React.FC<CallListViewProps> = ({ 
  calls = [], 
  isLoading = false 
}) => {
  const { state, selectCall } = useVoice();
  const { activeCalls } = useCalls();

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

  const getStatusBadge = (call: Call) => {
    const metadata = call.metadata || {};
    
    if (call.status === 'ringing' || call.status === 'answered') {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>;
    }
    
    if (metadata.missReason || metadata.miss_reason) {
      return <Badge variant="destructive">Missed</Badge>;
    }
    
    if (metadata.voicemailDuration || metadata.duration) {
      return <Badge variant="secondary">Voicemail Left</Badge>;
    }
    
    return <Badge variant="outline">Completed</Badge>;
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? 
      <ArrowDownLeft className="h-4 w-4 text-blue-600" /> : 
      <ArrowUpRight className="h-4 w-4 text-green-600" />;
  };

  const handleCallClick = (call: Call) => {
    selectCall(call.id);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading calls...</p>
        </div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-8">
          <Phone className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-medium mb-2">No calls found</h3>
          <p className="text-muted-foreground">
            {state.filters.searchQuery 
              ? 'Try adjusting your search or filters'
              : 'Calls will appear here once they start coming in'
            }
          </p>
        </div>
      </div>
    );
  }

  const isCallActive = (call: Call) => {
    return activeCalls.some(activeCall => activeCall.id === call.id);
  };

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 p-2">
        {calls.map((call) => {
          const isActive = isCallActive(call);
          const isSelected = state.selectedCallId === call.id;
          
          return (
            <Card 
              key={call.id} 
              className={cn(
                "transition-all duration-200 hover:shadow-md cursor-pointer",
                isSelected && "ring-2 ring-primary bg-accent/50",
                isActive && "border-green-500 bg-green-50/50"
              )}
              onClick={() => handleCallClick(call)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-0.5">
                      {getDirectionIcon(call.direction)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-base">
                          {formatPhoneNumber(call.customer_phone)}
                        </span>
                        {getStatusBadge(call)}
                        {isActive && (
                          <Badge className="bg-green-100 text-green-800 animate-pulse">
                            Live
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{format(new Date(call.started_at), 'MMM d, HH:mm')}</span>
                        </div>
                        
                        {call.duration_seconds && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(call.duration_seconds)}</span>
                          </div>
                        )}
                        
                        {call.agent_phone && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{formatPhoneNumber(call.agent_phone)}</span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        {call.ended_at 
                          ? `Ended ${formatDistanceToNow(new Date(call.ended_at), { addSuffix: true })}`
                          : `Started ${formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <CallActionButton
                      phoneNumber={call.customer_phone}
                      size="sm"
                      className="h-8 px-2"
                    />
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle more actions
                      }}
                      className="h-8 px-2"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
};