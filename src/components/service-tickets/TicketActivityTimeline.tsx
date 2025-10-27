import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  User, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  MessageSquare,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useServiceTicketEvents } from '@/hooks/useServiceTicketEvents';
import { formatDistanceToNow } from 'date-fns';
import type { ServiceTicketEvent } from '@/types/service-tickets';

interface TicketActivityTimelineProps {
  ticketId: string;
}

export const TicketActivityTimeline = ({ ticketId }: TicketActivityTimelineProps) => {
  const { events, isLoading } = useServiceTicketEvents(ticketId);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'status_changed':
        return <ArrowRight className="h-4 w-4" />;
      case 'assigned':
        return <User className="h-4 w-4" />;
      case 'priority_changed':
        return <AlertCircle className="h-4 w-4" />;
      case 'comment_added':
        return <MessageSquare className="h-4 w-4" />;
      case 'scheduled':
        return <Calendar className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created':
        return 'bg-blue-500';
      case 'status_changed':
        return 'bg-purple-500';
      case 'assigned':
        return 'bg-cyan-500';
      case 'priority_changed':
        return 'bg-orange-500';
      case 'comment_added':
        return 'bg-green-500';
      case 'completed':
        return 'bg-emerald-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatEventDescription = (event: ServiceTicketEvent) => {
    const parts = [];
    
    if (event.old_value && event.new_value) {
      parts.push(
        <span key="values">
          from <Badge variant="outline" className="mx-1">{event.old_value}</Badge>
          to <Badge variant="outline" className="mx-1">{event.new_value}</Badge>
        </span>
      );
    } else if (event.new_value) {
      parts.push(
        <Badge key="new" variant="outline" className="mx-1">
          {event.new_value}
        </Badge>
      );
    }

    if (event.comment) {
      parts.push(
        <span key="comment" className="text-muted-foreground italic block mt-1">
          "{event.comment}"
        </span>
      );
    }

    return parts;
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading activity...</div>;
  }

  if (events.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className={`rounded-full p-2 ${getEventColor(event.event_type)} text-white`}>
              {getEventIcon(event.event_type)}
            </div>
            {index < events.length - 1 && (
              <div className="w-0.5 flex-1 bg-border mt-2" />
            )}
          </div>

          {/* Event content */}
          <Card className="flex-1 p-4 -mt-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {event.triggered_by && (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={event.triggered_by.avatar_url} />
                    <AvatarFallback>
                      {event.triggered_by.full_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-sm font-medium">
                  {event.triggered_by?.full_name || 'System'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="text-sm">
              <span className="capitalize">{event.event_type.replace('_', ' ')}</span>
              {' '}
              {formatEventDescription(event)}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};
