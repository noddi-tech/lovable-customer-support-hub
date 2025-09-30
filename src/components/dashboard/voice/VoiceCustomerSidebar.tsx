import React from 'react';
import { Phone, Clock, User, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { NoddihKundeData } from '@/components/dashboard/NoddihKundeData';
import { CustomerNotes } from '@/components/dashboard/CustomerNotes';
import { Call } from '@/hooks/useCalls';

interface VoiceCustomerSidebarProps {
  call: Call;
  className?: string;
}

export const VoiceCustomerSidebar: React.FC<VoiceCustomerSidebarProps> = ({
  call,
  className,
}) => {
  // Extract customer from call
  const customer = call.customers ? {
    id: call.customers.id,
    full_name: call.customers.full_name,
    email: call.customers.email,
    phone: call.customers.phone || call.customer_phone,
  } : undefined;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered':
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'ringing':
      case 'on_hold':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'missed':
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Customer Information Card */}
        {customer && customer.id && (
          <NoddihKundeData customer={customer} />
        )}

        {/* Call Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge variant="outline" className={getStatusColor(call.status)}>
                {call.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            {/* Direction */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Direction</span>
              <Badge variant="secondary">
                {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
              </Badge>
            </div>

            {/* Duration */}
            {call.duration_seconds !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Duration
                </span>
                <span className="text-sm font-medium">
                  {formatDuration(call.duration_seconds)}
                </span>
              </div>
            )}

            {/* Phone Number */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Phone</span>
              <span className="text-sm font-medium font-mono">
                {call.customer_phone || 'Unknown'}
              </span>
            </div>

            {/* Agent Phone (if outbound) */}
            {call.agent_phone && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Agent</span>
                <span className="text-sm font-medium font-mono">
                  {call.agent_phone}
                </span>
              </div>
            )}

            {/* End Reason (if available) */}
            {call.end_reason && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">End Reason</span>
                <span className="text-sm">
                  {call.end_reason.replace(/_/g, ' ')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Notes Section */}
        {customer && customer.id && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Call Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerNotes customerId={customer.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
