import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { getCustomerCacheKey } from '@/utils/customerCacheKey';

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

type PaidState = 'paid' | 'partially_paid' | 'unpaid' | 'unknown';

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
      match_mode: "phone" | "email";
      conflict: boolean;
      vehicle_label?: string | null;
      service_title?: string | null;
      order_summary?: {
        currency: string;
        lines: Array<{
          kind: "discount" | "line";
          name: string;
          quantity: number;
          unit_amount: number;
          subtotal: number;
        }>;
        vat: number;
        total: number;
      } | null;
      order_tags?: string[];
      order_lines?: Array<{
        name: string;
        quantity: number;
        amount_gross: number;
        currency: string;
        is_discount?: boolean;
        is_fee?: boolean;
      }>;
      money?: {
        currency: string;
        gross: number;
        net: number;
        vat: number;
        paid: number;
        outstanding: number;
        paid_state: PaidState;
      };
      unable_to_complete?: boolean;
      unable_label?: string | null;
      partner_urls?: {
        customer_url: string | null;
        booking_url: string | null;
        booking_id: number | null;
      };
      timezone?: string;
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
    queryKey: ['noddi-customer-lookup', getCustomerCacheKey(customer), profile?.organization_id],
    queryFn: async (): Promise<NoddiLookupResponse | null> => {
      if ((!customer?.email && !customer?.phone) || !profile?.organization_id) {
        console.log('[Noddi API] ⚠️ Skipping lookup - missing required data:', {
          hasEmail: !!customer?.email,
          hasPhone: !!customer?.phone,
          hasOrgId: !!profile?.organization_id
        });
        return null;
      }

      const startTime = Date.now();
      const timestamp = new Date().toISOString();
      
      console.log('[Noddi API] 🚀 Starting customer lookup:', {
        customerId: customer.id,
        email: customer.email,
        phone: customer.phone,
        organizationId: profile.organization_id,
        timestamp
      });
      
      try {
        const { data, error } = await supabase.functions.invoke('noddi-customer-lookup', {
          body: {
            email: customer.email,
            phone: customer.phone,
            customerId: customer.id,
            organizationId: profile.organization_id
          }
        });

        const duration = Date.now() - startTime;

        if (error) {
          console.error('[Noddi API] ❌ Lookup failed:', {
            duration: `${duration}ms`,
            error: error.message,
            details: error,
            timestamp: new Date().toISOString()
          });
          throw new Error(`Failed to lookup Noddi data: ${error.message}`);
        }

        console.log('[Noddi API] ✅ Lookup completed successfully:', {
          duration: `${duration}ms`,
          source: data?.source || 'unknown',
          found: data?.data?.found || false,
          hasUser: !!data?.data?.user,
          hasPriorityBooking: !!data?.data?.priority_booking,
          unpaidCount: data?.data?.unpaid_count || 0,
          timestamp: new Date().toISOString()
        });

        return data as NoddiLookupResponse;
      } catch (err: any) {
        const duration = Date.now() - startTime;
        console.error('[Noddi API] 💥 Exception during lookup:', {
          duration: `${duration}ms`,
          error: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
        throw err;
      }
    },
    enabled: (!!customer?.email || !!customer?.phone) && !!profile?.organization_id,
    staleTime: Infinity, // CRITICAL: Never consider data stale (historical data)
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache even when inactive
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch when network reconnects
    retry: (failureCount, error) => {
      // Don't retry if customer not found or rate limited
      if (error.message?.includes('not found') || error.message?.includes('rate limited')) {
        return false;
      }
      return failureCount < 1; // Only retry once
    },
    // Show previous data while fetching (reduces loading states)
    placeholderData: (previousData) => previousData,
    // Use cached data aggressively
    networkMode: 'offlineFirst',
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      if ((!customer?.email && !customer?.phone) || !profile?.organization_id) {
        throw new Error('Customer email/phone and organization ID are required');
      }

      // Force fresh lookup by bypassing cache
      const { data, error } = await supabase.functions.invoke('noddi-customer-lookup', {
        body: {
          email: customer.email,
          phone: customer.phone,
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
      // Update the cache with fresh data (must match query key structure)
      queryClient.setQueryData(['noddi-customer-lookup', getCustomerCacheKey(customer), profile?.organization_id], data);
      toast.success('Noddi customer data refreshed');
    },
    onError: (error) => {
      console.error('Failed to refresh Noddi data:', error);
      toast.error(`Failed to refresh Noddi data: ${error.message}`);
    }
  });

  // Debug cache usage
  useEffect(() => {
    if (lookupQuery.data) {
      console.log('[useNoddihKundeData] ✅ Using cached data:', {
        source: lookupQuery.data.source,
        dataAge: lookupQuery.dataUpdatedAt,
        isFetching: lookupQuery.isFetching,
        isStale: lookupQuery.isStale,
      });
    }
  }, [lookupQuery.data, lookupQuery.dataUpdatedAt, lookupQuery.isFetching, lookupQuery.isStale]);

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