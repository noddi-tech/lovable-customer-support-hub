import React, { useState } from 'react';
import { Phone, Clock, MessageSquare, Mail, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NoddihKundeData } from '@/components/dashboard/NoddihKundeData';
import { CustomerNotes } from '@/components/dashboard/CustomerNotes';
import { Call } from '@/hooks/useCalls';
import { useSimpleRealtimeSubscriptions } from '@/hooks/useSimpleRealtimeSubscriptions';

interface VoiceCustomerSidebarProps {
  call?: Call;
  customerPhone?: string;
  className?: string;
}

export const VoiceCustomerSidebar: React.FC<VoiceCustomerSidebarProps> = ({
  call,
  customerPhone: propCustomerPhone,
  className,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for email form
  const [emailToAdd, setEmailToAdd] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Extract customer data - from call or use provided phone
  const customerPhone = call?.customer_phone || propCustomerPhone;
  const customer = call?.customers ? {
    id: call.customers.id,
    full_name: call.customers.full_name,
    email: call.customers.email,
    phone: call.customers.phone || call.customer_phone,
  } : undefined;

  // Create minimal customer object for Noddi lookup when we only have a phone number
  const customerForNoddi = customer || (customerPhone ? {
    id: `temp-${customerPhone}`,
    phone: customerPhone,
    email: undefined,
    full_name: undefined
  } : undefined);

  // Real-time subscription for customer updates
  useSimpleRealtimeSubscriptions(
    customer?.id ? [{ table: 'customers', queryKey: 'calls' }] : [],
    !!customer?.id
  );

  // Early return if no data
  if (!call && !customerPhone) {
    return (
      <div className={className}>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No call or customer information available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Update email mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (email: string) => {
      if (!customer?.id) throw new Error('No customer to update');
      
      const { error } = await supabase
        .from('customers')
        .update({ email })
        .eq('id', customer.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Email updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setEmailToAdd('');
      setError(null);
    },
    onError: (err: any) => {
      const errorMsg = err.message || 'Failed to update email';
      setError(errorMsg);
      toast({ 
        title: 'Error updating email', 
        description: errorMsg,
        variant: 'destructive' 
      });
    },
  });

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

  const handleUpdateEmail = () => {
    if (!emailToAdd.trim()) {
      setError('Email is required');
      return;
    }
    updateEmailMutation.mutate(emailToAdd.trim());
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Customer Information - always show for phone lookup */}
        {customerForNoddi && (
          <>
            <NoddihKundeData customer={customerForNoddi} />

            {/* Email Capture Card - only show if we have a real customer without email */}
            {customer && !customer.email && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Add Email for Booking Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Add an email address to see booking information from Noddi
                  </p>
                  <div className="space-y-2">
                    <Input
                      type="email"
                      value={emailToAdd}
                      onChange={(e) => setEmailToAdd(e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <Button 
                    onClick={handleUpdateEmail} 
                    className="w-full"
                    disabled={updateEmailMutation.isPending || !emailToAdd.trim()}
                  >
                    {updateEmailMutation.isPending ? 'Updating...' : 'Update Email'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Call Details Card */}
        {call && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge variant="outline" className={getStatusColor(call.status)}>
                  {call.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Direction</span>
                <Badge variant="secondary">
                  {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
                </Badge>
              </div>
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
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Phone</span>
                <span className="text-sm font-medium font-mono">
                  {call.customer_phone || 'Unknown'}
                </span>
              </div>
              {call.agent_phone && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Agent</span>
                  <span className="text-sm font-medium font-mono">
                    {call.agent_phone}
                  </span>
                </div>
              )}
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
        )}

        {/* Call Notes Section - only show if we have a real customer */}
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
