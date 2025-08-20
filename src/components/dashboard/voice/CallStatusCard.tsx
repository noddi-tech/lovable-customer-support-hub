import React from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Call } from '@/hooks/useCalls';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { CallActionButton } from './CallActionButton';
import { formatDistanceToNow } from 'date-fns';
import { getMonitoredPhoneForCall } from '@/utils/phoneNumberUtils';

interface CallStatusCardProps {
  call: Call;
  onViewDetails?: (call: Call) => void;
}

export const CallStatusCard: React.FC<CallStatusCardProps> = ({ call, onViewDetails }) => {
  const { getIntegrationByProvider } = useVoiceIntegrations();
  const aircallIntegration = getIntegrationByProvider('aircall');
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
      case 'completed':
        return 'bg-green-600';
      case 'on_hold':
        return 'bg-blue-500';
      case 'missed':
        return 'bg-red-500';
      case 'busy':
        return 'bg-red-400';
      case 'failed':
        return 'bg-red-600';
      case 'voicemail':
        return 'bg-purple-500';
      case 'transferred':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusDetails = () => {
    const metadata = call.metadata || {};
    const status = call.status;
    
    switch (status) {
      case 'missed':
        const missReason = metadata.missReason || metadata.miss_reason || metadata.originalPayload?.reason;
        return {
          label: 'MISSED',
          description: missReason || 'Customer did not answer'
        };
      case 'busy':
        return {
          label: 'BUSY',
          description: 'Line was busy'
        };
      case 'failed':
        const failReason = metadata.failReason || metadata.error || 'Technical issue';
        return {
          label: 'FAILED',
          description: failReason
        };
      case 'voicemail':
        const vmDuration = metadata.voicemailDuration || metadata.duration;
        return {
          label: 'VOICEMAIL',
          description: vmDuration ? `Voicemail left (${vmDuration}s)` : 'Voicemail left'
        };
      case 'transferred':
        const transferTo = metadata.transferredTo || metadata.transfer_to;
        return {
          label: 'TRANSFERRED',
          description: transferTo || 'Call transferred'
        };
      case 'answered':
        return {
          label: 'ANSWERED',
          description: 'Call was answered'
        };
      case 'completed':
        return {
          label: 'COMPLETED',
          description: 'Call completed successfully'
        };
      case 'on_hold':
        return {
          label: 'ON HOLD',
          description: 'Call is on hold'
        };
      case 'ringing':
        return {
          label: 'RINGING',
          description: 'Currently ringing'
        };
      default:
        return {
          label: (status as string).toUpperCase(),
          description: `Status: ${status}`
        };
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
          <div className="flex flex-col items-end gap-1">
            <Badge 
              variant="secondary" 
              className={`text-white ${getStatusColor()}`}
              title={getStatusDetails().description}
            >
              {getStatusDetails().label}
            </Badge>
            {getStatusDetails().description !== `Status: ${call.status}` && (
              <span className="text-xs text-muted-foreground text-right">
                {getStatusDetails().description}
              </span>
            )}
          </div>
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
          
          {/* Show monitored phone number */}
          {(() => {
            const monitoredPhone = getMonitoredPhoneForCall(call, aircallIntegration);
            if (monitoredPhone) {
              return (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Line:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{monitoredPhone.phoneNumber.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {monitoredPhone.type === 'company' ? 'Company' : 'Agent'}
                    </Badge>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
        
        <div className="flex gap-2 pt-2">
          <CallActionButton
            phoneNumber={call.customer_phone}
            size="sm"
          />
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