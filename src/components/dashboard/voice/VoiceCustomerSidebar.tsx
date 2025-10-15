import React, { useState } from 'react';
import { Phone, Clock, MessageSquare, Mail, AlertCircle, User, Calendar, TrendingUp, DollarSign, CheckCircle2, XCircle } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNoddihKundeData } from '@/hooks/useNoddihKundeData';

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

  // Get Noddi data
  const { data: noddiData, isLoading: noddiLoading } = useNoddihKundeData(customerForNoddi);
  
  // Quick stats from Noddi data
  const stats = noddiData?.data?.found ? {
    totalBookings: (noddiData.data.unpaid_bookings?.length || 0) + 
                   (noddiData.data.priority_booking ? 1 : 0),
    unpaidBookings: noddiData.data.unpaid_count || 0,
    hasPriority: !!noddiData.data.priority_booking,
  } : null;

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

        {/* Hero Section - Customer Identity */}
        {customerForNoddi && (
          <Card className="border-2">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {customer?.full_name?.charAt(0)?.toUpperCase() || 
                     customerPhone?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold truncate">
                    {customer?.full_name || customerPhone || 'Unknown Customer'}
                  </h3>
                  {customerPhone && (
                    <p className="text-sm text-muted-foreground font-mono">
                      {customerPhone}
                    </p>
                  )}
                  {customer?.email && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats Grid */}
              {stats && (
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {stats.totalBookings}
                    </div>
                    <div className="text-xs text-muted-foreground">Bookings</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${stats.unpaidBookings > 0 ? 'text-destructive' : 'text-success'}`}>
                      {stats.unpaidBookings}
                    </div>
                    <div className="text-xs text-muted-foreground">Unpaid</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl">
                      {stats.hasPriority ? '⭐' : '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">Priority</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alert Banners */}
        {noddiData?.data?.found && (
          <>
            {noddiData.data.priority_booking && (
              <Alert className="border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm font-medium">
                  <strong>Priority Booking:</strong> {noddiData.data.priority_booking.booking_type}
                </AlertDescription>
              </Alert>
            )}
            {noddiData.data.unpaid_count > 0 && (
              <Alert className="border-destructive bg-destructive/10">
                <XCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-sm font-medium">
                  <strong>{noddiData.data.unpaid_count}</strong> unpaid booking(s)
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Tabbed Content */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="call">Call Info</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {customerForNoddi && (
              <NoddihKundeData customer={customerForNoddi} />
            )}
            
            {/* Email Capture Card */}
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
                    Add an email to see booking information
                  </p>
                  <Input
                    type="email"
                    value={emailToAdd}
                    onChange={(e) => setEmailToAdd(e.target.value)}
                    placeholder="customer@example.com"
                  />
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
          </TabsContent>

          {/* Call Info Tab */}
          <TabsContent value="call" className="space-y-4">
            {call ? (
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
                      {call.direction === 'inbound' ? '↓ Incoming' : '↑ Outgoing'}
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
                    <span className="text-xs text-muted-foreground">Customer Phone</span>
                    <span className="text-sm font-medium font-mono">
                      {call.customer_phone || 'Unknown'}
                    </span>
                  </div>
                  {call.agent_phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Agent Phone</span>
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
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No call selected
              </div>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4">
            {customer && customer.id ? (
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
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No customer information available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
