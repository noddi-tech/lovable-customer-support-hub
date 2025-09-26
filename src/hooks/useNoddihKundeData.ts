import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface NoddihCustomer {
  noddiUserId: number;
  userGroupId: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  phoneVerified?: boolean;
  registrationDate?: string;
}

interface NoddihBooking {
  id: number;
  status: string;
  deliveryWindowStartsAt?: string;
  deliveryWindowEndsAt?: string;
  completedAt?: string;
  services?: any[];
  totalAmount?: number;
  paymentStatus?: string;
}

export type NoddiLookupResponse = {
  ok: boolean;
  source: "cache" | "live";
  ttl_seconds: number;
  data: {
    found: boolean;
    email: string;
    noddi_user_id: number | null;
    user_group_id: number | null;
    user: any;
    priority_booking_type: "upcoming" | "completed" | null;
    priority_booking: any;
    unpaid_count: number;
    unpaid_bookings: any[];
    ui_meta: {
      display_name: string;
      user_group_badge: number | null;
      unpaid_count: number;
      status_label: string | null;
      booking_date_iso: string | null;
      version: string;
      source: "cache" | "live";
    };
  };
  // Legacy support for transition period
  error?: string;
  notFound?: boolean;
  rateLimited?: boolean;
};

interface Customer {
  id: string;
  email?: string;
  phone?: string;
  full_name?: string;
}

export const useNoddihKundeData = (customer: Customer | null) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const lookupQuery = useQuery({
    queryKey: ['noddi-customer-lookup', customer?.email, profile?.organization_id],
    queryFn: async (): Promise<NoddiLookupResponse | null> => {
      if (!customer?.email || !profile?.organization_id) {
        return null;
      }

      console.log('Looking up Noddi customer data for:', customer.email);
      
      const { data, error } = await supabase.functions.invoke('noddi-customer-lookup', {
        body: {
          email: customer.email,
          customerId: customer.id,
          organizationId: profile.organization_id
        }
      });

      if (error) {
        console.error('Noddi lookup error:', error);
        throw new Error(`Failed to lookup Noddi data: ${error.message}`);
      }

      return data as NoddiLookupResponse;
    },
    enabled: !!customer?.email && !!profile?.organization_id,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    retry: (failureCount, error) => {
      // Don't retry if customer not found or rate limited
      if (error.message?.includes('not found') || error.message?.includes('rate limited')) {
        return false;
      }
      return failureCount < 2;
    }
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!customer?.email || !profile?.organization_id) {
        throw new Error('Customer email and organization ID are required');
      }

      // Force fresh lookup by bypassing cache
      const { data, error } = await supabase.functions.invoke('noddi-customer-lookup', {
        body: {
          email: customer.email,
          customerId: customer.id,
          organizationId: profile.organization_id,
          forceRefresh: true
        }
      });

      if (error) {
        throw new Error(`Failed to refresh Noddi data: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Update the cache with fresh data
      queryClient.setQueryData(['noddi-customer-lookup', customer?.email, profile?.organization_id], data);
      toast.success('Noddi customer data refreshed');
    },
    onError: (error) => {
      console.error('Failed to refresh Noddi data:', error);
      toast.error(`Failed to refresh Noddi data: ${error.message}`);
    }
  });

  const hasEmail = !!customer?.email;
  const hasPhoneOnly = !!customer?.phone && !customer?.email;
  const isAuthenticated = !!profile?.organization_id;
  
  return {
    data: lookupQuery.data,
    isLoading: lookupQuery.isLoading,
    error: lookupQuery.error,
    isError: lookupQuery.isError,
    hasEmail,
    hasPhoneOnly,
    isAuthenticated,
    refresh: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
    customer
  };
};