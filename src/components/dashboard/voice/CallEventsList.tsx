import React, { useState } from 'react';
import { Clock, Phone, PhoneCall, PhoneOff, AlertCircle, User, Building2, ArrowUpRight, ArrowDownLeft, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CallActionButton } from './CallActionButton';
import { CallEvent } from '@/hooks/useCalls';
import { formatDistanceToNow, format } from 'date-fns';

interface CallEventsListProps {
  events: CallEvent[];
}

const EventCard: React.FC<{ event: CallEvent }> = ({ event }) => {
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract rich data from event
  const callData = event.event_data?.callData || {};
  const customerPhone = callData.raw_digits || callData.customer_phone;
  const agentName = callData.user?.name;
  const agentEmail = callData.user?.email;
  const lineName = callData.number?.name;
  const lineNumber = callData.number?.digits || callData.number?.e164_digits;
  const direction = callData.direction;
  const duration = callData.duration;
  const webhookEvent = event.event_data?.webhookEvent;
  const dtmfKey = event.event_data?.dtmf;
  const ivrOptions = callData.ivr_options || [];
  const answeredAt = callData.answered_at;
  const endedAt = callData.ended_at;
  
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
      case 'dtmf_pressed':
        return <Clock className="h-4 w-4" />;
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

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const getDirectionIcon = (direction?: string) => {
    if (direction === 'inbound') {
      return <ArrowDownLeft className="h-3 w-3 text-blue-600" />;
    } else if (direction === 'outbound') {
      return <ArrowUpRight className="h-3 w-3 text-green-600" />;
    }
    return null;
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Event Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full text-white ${getEventColor(event.event_type)}`}>
                {getEventIcon(event.event_type)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatEventType(event.event_type)}
                  </span>
                  {direction && getDirectionIcon(direction)}
                  {webhookEvent && (
                    <Badge variant="outline" className="text-xs">
                      {webhookEvent.replace(/"/g, '')}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(event.timestamp), 'MMM d, HH:mm:ss')} • {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsJsonOpen(!isJsonOpen)}
                className="h-6 px-2 text-xs"
              >
                {isJsonOpen ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                JSON
              </Button>
              {(customerPhone || agentName || lineName) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 px-2 text-xs"
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Details
                </Button>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="flex flex-wrap gap-4">
              {customerPhone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{formatPhoneNumber(customerPhone)}</span>
                </div>
              )}
              {duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span>{formatDuration(duration)}</span>
                </div>
              )}
              {dtmfKey && (
                <div className="flex items-center gap-1">
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    DTMF: {dtmfKey}
                  </span>
                </div>
              )}
            </div>
            
            {/* Call Action Button */}
            {customerPhone && (
              <CallActionButton
                phoneNumber={customerPhone}
                size="sm"
                className="h-6 px-2 text-xs"
              />
            )}
          </div>

          {/* Expanded Details */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="space-y-3">
              {/* Customer Information */}
              {customerPhone && (
                <div className="border-l-4 border-blue-500 pl-3">
                  <h4 className="text-sm font-medium text-blue-700 mb-1">Customer</h4>
                  <div className="text-sm space-y-1">
                    <div>Phone: {formatPhoneNumber(customerPhone)}</div>
                  </div>
                </div>
              )}

              {/* Agent Information */}
              {(agentName || agentEmail) && (
                <div className="border-l-4 border-green-500 pl-3">
                  <h4 className="text-sm font-medium text-green-700 mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Agent
                  </h4>
                  <div className="text-sm space-y-1">
                    {agentName && <div>Name: {agentName}</div>}
                    {agentEmail && <div>Email: {agentEmail}</div>}
                  </div>
                </div>
              )}

              {/* Phone Line Information */}
              {(lineName || lineNumber) && (
                <div className="border-l-4 border-purple-500 pl-3">
                  <h4 className="text-sm font-medium text-purple-700 mb-1 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Phone Line
                  </h4>
                  <div className="text-sm space-y-1">
                    {lineName && <div>Name: {lineName}</div>}
                    {lineNumber && <div>Number: {formatPhoneNumber(lineNumber)}</div>}
                  </div>
                </div>
              )}

              {/* Call Timing */}
              {(answeredAt || endedAt) && (
                <div className="border-l-4 border-orange-500 pl-3">
                  <h4 className="text-sm font-medium text-orange-700 mb-1">Call Timing</h4>
                  <div className="text-sm space-y-1">
                    {answeredAt && (
                      <div>Answered: {format(new Date(answeredAt * 1000), 'MMM d, HH:mm:ss')}</div>
                    )}
                    {endedAt && (
                      <div>Ended: {format(new Date(endedAt * 1000), 'MMM d, HH:mm:ss')}</div>
                    )}
                  </div>
                </div>
              )}

              {/* IVR Interactions */}
              {ivrOptions.length > 0 && (
                <div className="border-l-4 border-indigo-500 pl-3">
                  <h4 className="text-sm font-medium text-indigo-700 mb-1">IVR Interactions</h4>
                  <div className="text-sm space-y-1">
                    {ivrOptions.map((option: any, index: number) => (
                      <div key={index} className="bg-indigo-50 p-2 rounded">
                        <div>Branch: {option.branch}</div>
                        {option.key && <div>Key Pressed: {option.key}</div>}
                        {option.title && <div>Option: {option.title}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* JSON Viewer */}
          <Collapsible open={isJsonOpen} onOpenChange={setIsJsonOpen}>
            <CollapsibleContent>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs font-mono max-h-96 overflow-auto">
                <pre>{JSON.stringify(event.event_data, null, 2)}</pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardContent>
    </Card>
  );
};

export const CallEventsList: React.FC<CallEventsListProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Call Events Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">No call events yet</p>
            <p className="text-sm text-muted-foreground">
              Call events will appear here as they occur
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Call Events Log</h3>
          <p className="text-sm text-muted-foreground">
            Detailed timeline of call events with customer and agent information
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {events.length} events
        </Badge>
      </div>
      
      <div className="space-y-3 max-h-[800px] overflow-y-auto">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
};