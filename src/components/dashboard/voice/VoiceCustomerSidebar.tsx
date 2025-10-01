import React, { useState, useEffect } from 'react';
import { Phone, Clock, User, MessageSquare, RefreshCw, Mail, UserPlus, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
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
  
  // State for forms
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
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

  // Check for multiple customers with same phone
  const { data: multipleCustomers, isLoading: isCheckingMultiple } = useQuery({
    queryKey: ['customers-by-phone', customerPhone],
    queryFn: async () => {
      if (!customerPhone) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', customerPhone);
      if (error) throw error;
      return data || [];
    },
    enabled: !customer && !!customerPhone,
  });

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

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: { full_name: string; email?: string; phone: string }) => {
      // Get organization_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();
      
      if (!profile?.organization_id) throw new Error('Organization not found');
      
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([{
          full_name: data.full_name,
          email: data.email || null,
          phone: data.phone,
          organization_id: profile.organization_id,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Link to call if available
      if (call?.id) {
        const { error: updateError } = await supabase
          .from('calls')
          .update({ customer_id: newCustomer.id })
          .eq('id', call.id);
        
        if (updateError) throw updateError;
      }
      
      return newCustomer;
    },
    onSuccess: () => {
      toast({ title: 'Customer created successfully' });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      setNewCustomerName('');
      setNewCustomerEmail('');
      setError(null);
    },
    onError: (err: any) => {
      const errorMsg = err.message || 'Failed to create customer';
      setError(errorMsg);
      toast({ 
        title: 'Error creating customer', 
        description: errorMsg,
        variant: 'destructive' 
      });
    },
  });

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

  // Link existing customer mutation
  const linkCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      if (!call?.id) throw new Error('No call to link to');
      
      const { error } = await supabase
        .from('calls')
        .update({ customer_id: customerId })
        .eq('id', call.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Customer linked successfully' });
      queryClient.invalidateQueries({ queryKey: ['calls'] });
    },
    onError: (err: any) => {
      toast({ 
        title: 'Error linking customer', 
        description: err.message,
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

  const handleCreateCustomer = () => {
    if (!newCustomerName.trim() || !customerPhone) {
      setError('Name and phone are required');
      return;
    }
    createCustomerMutation.mutate({
      full_name: newCustomerName.trim(),
      email: newCustomerEmail.trim() || undefined,
      phone: customerPhone,
    });
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

        {/* Multiple Customers Selection */}
        {!customer && multipleCustomers && multipleCustomers.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Select Customer ({multipleCustomers.length} found)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {multipleCustomers.map((cust) => (
                <Button
                  key={cust.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => linkCustomerMutation.mutate(cust.id)}
                  disabled={linkCustomerMutation.isPending}
                >
                  <div className="text-left">
                    <div className="font-medium">{cust.full_name}</div>
                    {cust.email && (
                      <div className="text-xs text-muted-foreground">{cust.email}</div>
                    )}
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Create Customer Form */}
        {!customer && (!multipleCustomers || multipleCustomers.length === 0) && !isCheckingMultiple && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Create Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Full Name *</Label>
                <Input
                  id="customer-name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email (optional)</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={newCustomerEmail}
                  onChange={(e) => setNewCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={customerPhone || ''} disabled />
              </div>
              <Button
                onClick={handleCreateCustomer} 
                className="w-full"
                disabled={createCustomerMutation.isPending || !newCustomerName.trim()}
              >
                {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isCheckingMultiple && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        )}

        {/* Customer Information */}
        {customer && customer.id && (
          <>
            <NoddihKundeData customer={customer} />

            {/* Email Capture Card */}
            {!customer.email && (
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
