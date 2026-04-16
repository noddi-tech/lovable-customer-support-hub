import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { getCustomerCacheKey } from '@/utils/customerCacheKey';
import { syncCustomerFromNoddi } from '@/utils/customerSync';

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
    all_user_groups?: Array<{
      id: number;
      name: string;
      is_personal: boolean;
      is_default: boolean;
      booking?: any;
      upcoming_booking?: any;
      recent_booking?: any;
      booking_type?: "upcoming" | "completed" | null;
      total_bookings: number;
      membership_programs?: Array<{
        id: number;
        name: string;
        status?: string;
        [key: string]: any;
      }>;
      coupons?: Array<{
        id: number;
        code?: string;
        description?: string;
        is_active?: boolean;
        valid_from?: string;
        valid_to?: string;
        [key: string]: any;
      }>;
      segments?: Array<{
        segment: string;
        service_department_id: number;
      }>;
      addresses?: Array<{
        id: number;
        name?: string;
        label?: string;
        address?: {
          street?: string;
          zip?: string;
          city?: string;
        };
      }>;
      tire_quotes?: Array<{
        id: number;
        slug: string;
        season: string;
        status: string;
        created_at: string;
        car: {
          license_plate?: string | null;
          make?: string | null;
          model?: string | null;
          color?: string[];
        };
        payment_amount?: {
          amount: number;
          currency: string;
        } | null;
        payment_status?: string | null;
        status_events?: Array<{
          created_at: string;
          status: string;
        }>;
        inventory_orders?: Array<{
          estimated_delivery_date: string;
          order_number: string;
          status: string;
          tracking_number: string;
        }>;
      }>;
    }>;
    most_recent_group_id?: number | null;
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
      booking_type?: string | null;
      location_type?: string | null;
      comments_unable_to_complete_public?: string | null;
      comments_unable_to_complete_internal?: string | null;
      comments?: {
        admin?: string | null;
        user?: string | null;
        worker?: string | null;
      } | null;
      address?: {
        street?: string;
        zip?: string;
        city?: string;
      } | null;
      slug?: string | null;
      brand_name?: string | null;
      cached_at?: string | null;
      feedback?: {
        customer_comment: string;
        customer_rating_car_result: number;
        customer_rating_communication: number;
        customer_rating_ease_of_use: number;
        customer_rating_overall: number;
        customer_rating_politeness?: number | null;
      } | null;
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

export const useNoddihKundeData = (customer: Customer | null, callId?: string) => {
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

        // ADD: Detailed response structure logging
        console.log('[Noddi API] 📦 Full Response Structure:', {
          ok: data?.ok,
          source: data?.source,
          ttl_seconds: data?.ttl_seconds,
          'data.found': data?.data?.found,
          'data.noddi_user_id': data?.data?.noddi_user_id,
          'data.user_group_id': data?.data?.user_group_id,
          'data.priority_booking': data?.data?.priority_booking ? 'EXISTS' : 'NULL',
          'data.priority_booking_type': data?.data?.priority_booking_type,
          'data.unpaid_count': data?.data?.unpaid_count,
          'data.unpaid_bookings': data?.data?.unpaid_bookings?.length || 0,
          'data.all_user_groups': data?.data?.all_user_groups?.length || 0,
          'data.ui_meta.version': data?.data?.ui_meta?.version,
          'data.ui_meta.source': data?.data?.ui_meta?.source
        });

        // Sync customer to database if found
        if (data?.data?.found && profile.organization_id) {
          const phone = customer?.phone || data?.data?.user?.phone;
          const displayName = data?.data?.ui_meta?.display_name;
          
          // For phone-based lookups, use existing sync logic
          if (phone && phone.trim() !== '') {
            console.log('[Noddi API] 💾 Syncing customer to database (phone-based):', {
              customerPhone: customer?.phone,
              noddiPhone: data?.data?.user?.phone,
              selectedPhone: phone,
              displayName,
              organizationId: profile.organization_id
            });
            
            const result = await syncCustomerFromNoddi(data, phone, profile.organization_id, callId);
            
            if (result) {
              console.log('[Noddi API] ✅ Customer synced successfully:', result.id);
            } else {
              console.warn('[Noddi API] ⚠️ Customer sync returned null');
            }
          }
          // For email-only customers, sync the display name back to their record
          else if (customer?.email && displayName && customer?.id) {
            const currentName = customer?.full_name?.toLowerCase()?.trim();
            const emailNormalized = customer?.email?.toLowerCase()?.trim();
            const displayNameNormalized = displayName?.toLowerCase()?.trim();
            
            // Only update if we have a proper name and it's different from email
            if (displayNameNormalized && displayNameNormalized !== emailNormalized && displayNameNormalized !== currentName) {
              console.log('[Noddi API] 💾 Syncing display name for email-only customer:', {
                customerId: customer.id,
                currentName: customer.full_name,
                newName: displayName,
                email: customer.email
              });
              
              const { error: updateError } = await supabase
                .from('customers')
                .update({ full_name: displayName })
                .eq('id', customer.id);
                
              if (updateError) {
                console.warn('[Noddi API] ⚠️ Failed to update customer name:', updateError);
              } else {
                console.log('[Noddi API] ✅ Customer name updated to:', displayName);
                // Invalidate conversation list queries to reflect updated name
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
              }
            }
          } else {
            console.warn('[Noddi API] ⚠️ No phone or email available for customer sync', {
              customerPhone: customer?.phone,
              customerEmail: customer?.email,
              noddiPhone: data?.data?.user?.phone
            });
          }
        }

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

      // Sync refreshed customer to database
      if (data?.data?.found && profile.organization_id) {
        const phone = customer?.phone || data?.data?.user?.phone;
        
        if (phone && phone.trim() !== '') {
          console.log('[Noddi API] 💾 Syncing refreshed customer to database:', {
            phone,
            organizationId: profile.organization_id
          });
          
          const result = await syncCustomerFromNoddi(data, phone, profile.organization_id, callId);
          
          if (result) {
            console.log('[Noddi API] ✅ Refreshed customer synced successfully:', result.id);
          }
        } else {
          console.warn('[Noddi API] ⚠️ No phone number for refresh sync');
        }
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
  
  const canRefresh = (!!customer?.email || !!customer?.phone) && !!profile?.organization_id;

  return {
    data: lookupQuery.data,
    isLoading: lookupQuery.isLoading,
    error: lookupQuery.error,
    isError: lookupQuery.isError,
    hasEmail,
    hasPhoneOnly,
    isAuthenticated,
    canRefresh,
    refresh: refreshMutation.mutate,
    isRefreshing: refreshMutation.isPending,
    customer
  };
};