import React, { useState } from 'react';
import { Phone, PhoneCall, PhoneIncoming, PhoneOff, Building2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Call } from '@/hooks/useCalls';
import { useVoiceIntegrations } from '@/hooks/useVoiceIntegrations';
import { CallActionButton } from './CallActionButton';
import { formatDistanceToNow } from 'date-fns';
import { getMonitoredPhoneForCall } from '@/utils/phoneNumberUtils';
import { ManualEndCallDialog } from './ManualEndCallDialog';

interface CallStatusCardProps {
  call: Call;
  onViewDetails?: (call: Call) => void;
}

export const CallStatusCard: React.FC<CallStatusCardProps> = ({ call, onViewDetails }) => {
  const { getIntegrationByProvider } = useVoiceIntegrations();
  const aircallIntegration = getIntegrationByProvider('aircall');
  const [isManualEndDialogOpen, setIsManualEndDialogOpen] = useState(false);
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
            label: 'CALLBACK REQUESTED',
            description: 'Customer requested callback via IVR'
          };
        }
        return {
          label: 'ABANDONED IN IVR',
          description: 'Customer hung up during IVR menu'
        };
      
      case 'hung_up':
        return {
          label: 'HUNG UP',
          description: 'Call terminated by customer'
        };
      
      case 'completed_normally':
        const agentName = enrichedDetails.user_name;
        return {
          label: 'COMPLETED',
          description: agentName ? `Handled by ${agentName}` : 'Call completed successfully'
        };
      
      case 'not_answered':
        if (availability === 'closed') {
          return {
            label: 'OUTSIDE HOURS',
            description: 'Call received outside business hours'
          };
        }
        return {
          label: 'NOT ANSWERED',
          description: 'No agent available'
        };
      
      // Fallback for older records
      case null:
      case undefined:
        const metadata = call.metadata || {};
        switch (call.status) {
          case 'missed':
            const missReason = metadata.missReason || metadata.miss_reason;
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
              label: (call.status as string).toUpperCase(),
              description: `Status: ${call.status}`
            };
        }
      
      default:
        return {
          label: endReason.replace(/_/g, ' ').toUpperCase(),
          description: `Call ended: ${endReason.replace(/_/g, ' ')}`
        };
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if call can be manually ended (ongoing status)
  const canBeManuallyEnded = ['ringing', 'answered', 'on_hold', 'transferred'].includes(call.status);

  const handleManualEndCall = () => {
    setIsManualEndDialogOpen(true);
  };

  const handleCallEnded = () => {
    // The parent component should refresh the data
    // This callback can be used to trigger a refresh
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
          
          {/* Enhanced agent info from enriched details */}
          {call.enriched_details?.user_name && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Handled by:</span>
              <span className="text-sm font-medium">{call.enriched_details.user_name}</span>
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
          
          {/* Business hours indicator */}
          {call.availability_status && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Business hours:</span>
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  call.availability_status === 'open' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-sm">
                  {call.availability_status === 'open' ? 'Open' : 'Closed'}
                </span>
              </div>
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
          
          {/* Manual End Call Button - Only show for ongoing calls */}
          {canBeManuallyEnded && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualEndCall}
              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            >
              <AlertTriangle className="h-4 w-4" />
              End Manually
            </Button>
          )}
        </div>
        
        {/* System ID */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground/60 font-mono">
            ID: {call.id}
          </p>
        </div>
      </CardContent>
      
      {/* Manual End Call Dialog */}
      <ManualEndCallDialog
        isOpen={isManualEndDialogOpen}
        onClose={() => setIsManualEndDialogOpen(false)}
        call={call}
        onCallEnded={handleCallEnded}
      />
    </Card>
  );
};