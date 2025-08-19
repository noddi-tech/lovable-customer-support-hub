import React from 'react';
import { Clock, Phone, PhoneCall, PhoneOff, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CallEvent } from '@/hooks/useCalls';
import { formatDistanceToNow } from 'date-fns';

interface CallEventsListProps {
  events: CallEvent[];
}

export const CallEventsList: React.FC<CallEventsListProps> = ({ events }) => {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'call_started':
        return <Phone className="h-4 w-4" />;
      case 'call_answered':
        return <PhoneCall className="h-4 w-4" />;
      case 'call_ended':
        return <PhoneOff className="h-4 w-4" />;
      case 'call_missed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'call_started':
        return 'bg-blue-500';
      case 'call_answered':
        return 'bg-green-500';
      case 'call_ended':
        return 'bg-gray-500';
      case 'call_missed':
        return 'bg-red-500';
      case 'dtmf_pressed':
        return 'bg-purple-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent call events</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent Events</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-96 overflow-y-auto space-y-2">
          {events.map((event) => (
            <div 
              key={event.id} 
              className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
            >
              <div className={`p-1 rounded-full text-white ${getEventColor(event.event_type)}`}>
                {getEventIcon(event.event_type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {formatEventType(event.event_type)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                  </span>
                </div>
                {event.event_data && Object.keys(event.event_data).length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {event.event_data.webhookEvent && (
                      <Badge variant="outline" className="text-xs mr-2">
                        {event.event_data.webhookEvent}
                      </Badge>
                    )}
                    {event.event_data.dtmf && (
                      <span>Pressed: {event.event_data.dtmf}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};