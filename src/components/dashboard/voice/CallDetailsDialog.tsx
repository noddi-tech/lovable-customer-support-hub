import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Phone, Clock, Calendar, User, MessageSquare, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
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
  onNavigateToEvents?: (call: Call) => void;
  onRemoveCall?: (callId: string) => void;
}

export const CallDetailsDialog = ({ call, isOpen, onClose, onNavigateToEvents, onRemoveCall }: CallDetailsDialogProps) => {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!call) return null;

  const handleRefreshCustomerData = async () => {
    setIsRefreshing(true);
    await queryClient.refetchQueries({
      queryKey: ['noddi-customer-lookup', call.customers?.email || call.customer_phone],
    });
    setIsRefreshing(false);
    toast({
      title: 'Customer data refreshed',
      description: 'Latest information has been loaded',
    });
  };

  const handleNavigateToEvents = () => {
    if (onNavigateToEvents) {
      onNavigateToEvents(call);
      onClose();
    } else {
      navigate(`/operations?tab=events&phone=${call.customer_phone}`);
      onClose();
    }
  };

  const handleRemoveCall = () => {
    if (onRemoveCall) {
      onRemoveCall(call.id);
      setShowRemoveDialog(false);
      onClose();
    }
  };

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
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call Details
              </DialogTitle>
              <DialogDescription>
                View call information and manage notes
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshCustomerData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNavigateToEvents}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Events
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRemoveDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
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

      {/* Remove Call Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove call from history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the call from your call history. This action can be undone by contacting support.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveCall}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};