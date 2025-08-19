import React from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Call } from '@/hooks/useCalls';
import { formatDistanceToNow } from 'date-fns';

interface CallStatusCardProps {
  call: Call;
  onViewDetails?: (call: Call) => void;
}

export const CallStatusCard: React.FC<CallStatusCardProps> = ({ call, onViewDetails }) => {
  const getStatusIcon = () => {
    switch (call.status) {
      case 'ringing':
        return <PhoneIncoming className="h-4 w-4" />;
      case 'answered':
        return <PhoneCall className="h-4 w-4" />;
      case 'on_hold':
        return <Phone className="h-4 w-4" />;
      default:
        return <PhoneOff className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (call.status) {
      case 'ringing':
        return 'bg-yellow-500';
      case 'answered':
        return 'bg-green-500';
      case 'on_hold':
        return 'bg-blue-500';
      case 'missed':
        return 'bg-red-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getStatusIcon()}
            {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call
          </CardTitle>
          <Badge 
            variant="secondary" 
            className={`text-white ${getStatusColor()}`}
          >
            {call.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {call.customer_phone && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customer:</span>
              <span className="text-sm font-medium">{call.customer_phone}</span>
            </div>
          )}
          {call.agent_phone && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Agent:</span>
              <span className="text-sm font-medium">{call.agent_phone}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Started:</span>
            <span className="text-sm">
              {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
            </span>
          </div>
          {call.duration_seconds && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Duration:</span>
              <span className="text-sm font-medium">{formatDuration(call.duration_seconds)}</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(call)}
            >
              View Details
            </Button>
          )}
          {call.recording_url && (
            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <a href={call.recording_url} target="_blank" rel="noopener noreferrer">
                Recording
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};