import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Clock, Calendar, MapPin, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { CallNotesSection } from './CallNotesSection';
import { NoddiCustomerDetails } from './NoddiCustomerDetails';

interface Call {
  id: string;
  customer_phone?: string;
  agent_phone?: string;
  customer_id?: string;
  customers?: {
    id: string;
    full_name?: string;
    email?: string;
    phone?: string;
  };
  status: string;
  direction: 'inbound' | 'outbound';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  provider: string;
  external_id: string;
}

interface CallDetailsDialogProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CallDetailsDialog = ({ call, isOpen, onClose }: CallDetailsDialogProps) => {
  if (!call) return null;

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'ringing':
        return 'warning';
      case 'answered':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'inbound' ? 'blue' : 'green';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Details
          </DialogTitle>
          <DialogDescription>
            View call information and manage notes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information from Noddi */}
          <NoddiCustomerDetails
            customerId={call.customer_id}
            customerEmail={call.customers?.email}
            customerPhone={call.customer_phone}
            customerName={call.customers?.full_name}
          />

          {/* Call Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Customer</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPhoneNumber(call.customer_phone)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Agent</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPhoneNumber(call.agent_phone) || 'Not assigned'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Started</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(call.started_at), 'PPp')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(call.duration_seconds)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Badge variant={getStatusColor(call.status) as any}>
                  {call.status.charAt(0).toUpperCase() + call.status.slice(1)}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={`border-${getDirectionColor(call.direction)}-200 text-${getDirectionColor(call.direction)}-700 bg-${getDirectionColor(call.direction)}-50`}
                >
                  {call.direction.charAt(0).toUpperCase() + call.direction.slice(1)}
                </Badge>
                <Badge variant="secondary">
                  {call.provider.charAt(0).toUpperCase() + call.provider.slice(1)}
                </Badge>
              </div>

              {call.ended_at && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <p>Ended: {format(new Date(call.ended_at), 'PPp')}</p>
                  <p>External ID: {call.external_id}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call Notes Section */}
          <CallNotesSection callId={call.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
};