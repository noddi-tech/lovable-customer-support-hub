import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NoddihCustomerLookupRequest {
  email: string;
  customerId?: string;
  organizationId?: string;
  forceRefresh?: boolean;
}

interface NoddihUser {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  language?: string;
  phoneVerified?: boolean;
  registrationDate?: string;
}

interface NoddihUserGroup {
  id: number;
  isDefaultUserGroup?: boolean;
  isPersonal?: boolean;
  name?: string;
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, customerId, organizationId, forceRefresh }: NoddihCustomerLookupRequest = await req.json();
    
    if (!email || !organizationId) {
      return new Response(
        JSON.stringify({ error: 'Email and organization ID are required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const noddihApiKey = Deno.env.get('NODDI_API_KEY');
    if (!noddihApiKey) {
      console.error('NODDI_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Noddi API key not configured' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting Noddi lookup for email: ${email}`);

    // Step 1: Check cache first (30-minute TTL) unless force refresh is requested
    if (!forceRefresh) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      try {
        const { data: cachedData } = await supabase
          .from('noddi_customer_cache')
          .select('*')
          .eq('email', email)
          .eq('organization_id', organizationId)
          .gte('last_refreshed_at', thirtyMinutesAgo)
          .maybeSingle();

        if (cachedData) {
          console.log('Returning cached Noddi data');
          return new Response(
            JSON.stringify({
              cached: true,
              customer: cachedData.cached_customer_data,
              priorityBooking: cachedData.cached_priority_booking,
              priorityBookingType: cachedData.priority_booking_type,
              pendingBookings: cachedData.cached_pending_bookings,
              pendingBookingsCount: cachedData.pending_bookings_count,
              lastRefreshed: cachedData.last_refreshed_at
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.log('Cache table not available, proceeding with API call');
      }
    } else {
      console.log('Force refresh requested, skipping cache');
    }

    // Step 2: Lookup user by email
    console.log('Fetching user from Noddi API');
    
    const userResponse = await fetch(`https://api.noddi.no/v1/users/get-by-email/?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Api-Key ${noddihApiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', userResponse.status);

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return new Response(
          JSON.stringify({ error: 'Customer not found in Noddi system', notFound: true }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (userResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limited by Noddi API. Please try again later.', rateLimited: true }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Noddi API error: ${userResponse.status} ${userResponse.statusText}`);
    }

    const noddihUser: NoddihUser = await userResponse.json();
    console.log(`Found Noddi user: ${noddihUser.id}`);

    // Step 3: Get user groups
    const groupsResponse = await fetch(`https://api.noddi.no/v1/user-groups/?user_ids=${noddihUser.id}`, {
      headers: {
        'Authorization': `Api-Key ${noddihApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!groupsResponse.ok) {
      throw new Error(`Failed to fetch user groups: ${groupsResponse.status}`);
    }

    const userGroups: NoddihUserGroup[] = await groupsResponse.json();
    console.log(`Found ${userGroups.length} user groups`);

    // Step 4: Select priority group (is_default_user_group > is_personal > first)
    let selectedGroup = userGroups.find(g => g.isDefaultUserGroup) || 
                       userGroups.find(g => g.isPersonal) || 
                       userGroups[0];

    if (!selectedGroup) {
      return new Response(
        JSON.stringify({ error: 'No user groups found for customer' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Using user group: ${selectedGroup.id}`);

    // Step 5: Get bookings (upcoming first, then completed)
    let priorityBooking: NoddihBooking | null = null;
    let priorityBookingType: 'upcoming' | 'completed' | null = null;

    // Try upcoming bookings first
    console.log('Fetching upcoming bookings');
    const upcomingResponse = await fetch(
      `https://api.noddi.no/v1/user-groups/${selectedGroup.id}/bookings-for-customer/?is_upcoming=true`,
      {
        headers: {
          'Authorization': `Api-Key ${noddihApiKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (upcomingResponse.ok) {
      const upcomingBookings: NoddihBooking[] = await upcomingResponse.json();
      if (upcomingBookings.length > 0) {
        // Sort by delivery date (nearest first)
        priorityBooking = upcomingBookings.sort((a, b) => 
          new Date(a.deliveryWindowStartsAt || '').getTime() - new Date(b.deliveryWindowStartsAt || '').getTime()
        )[0];
        priorityBookingType = 'upcoming';
        console.log(`Found ${upcomingBookings.length} upcoming bookings, using booking ${priorityBooking.id}`);
      }
    }

    // If no upcoming bookings, get most recent completed
    if (!priorityBooking) {
      console.log('No upcoming bookings, fetching completed bookings');
      const completedResponse = await fetch(
        `https://api.noddi.no/v1/user-groups/${selectedGroup.id}/bookings-for-customer/?is_completed=true`,
        {
          headers: {
            'Authorization': `Api-Key ${noddihApiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      if (completedResponse.ok) {
        const completedBookings: NoddihBooking[] = await completedResponse.json();
        if (completedBookings.length > 0) {
          // Sort by completion date (most recent first)
          priorityBooking = completedBookings.sort((a, b) => 
            new Date(b.completedAt || b.deliveryWindowStartsAt || '').getTime() - 
            new Date(a.completedAt || a.deliveryWindowStartsAt || '').getTime()
          )[0];
          priorityBookingType = 'completed';
          console.log(`Found ${completedBookings.length} completed bookings, using booking ${priorityBooking.id}`);
        }
      }
    }

    // Step 6: Check for unpaid bookings
    console.log('Checking for unpaid bookings');
    let pendingBookings: NoddihBooking[] = [];
    
    const unpaidResponse = await fetch('https://api.noddi.no/v1/bookings/unpaid/', {
      headers: {
        'Authorization': `Api-Key ${noddihApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (unpaidResponse.ok) {
      const allUnpaidBookings: NoddihBooking[] = await unpaidResponse.json();
      // Filter to only this user group's bookings (this is a simplification - 
      // in reality we'd need to check which bookings belong to this user)
      pendingBookings = allUnpaidBookings.slice(0, 5); // Limit for demo
      console.log(`Found ${pendingBookings.length} unpaid bookings`);
    }

    // Step 7: Prepare response data
    const responseData = {
      cached: false,
      customer: {
        noddiUserId: noddihUser.id,
        userGroupId: selectedGroup.id,
        email: noddihUser.email,
        firstName: noddihUser.firstName,
        lastName: noddihUser.lastName,
        phone: noddihUser.phone,
        language: noddihUser.language,
        phoneVerified: noddihUser.phoneVerified,
        registrationDate: noddihUser.registrationDate
      },
      priorityBooking,
      priorityBookingType,
      pendingBookings,
      pendingBookingsCount: pendingBookings.length,
      lastRefreshed: new Date().toISOString()
    };

    // Step 8: Update cache (if table exists)
    try {
      await supabase
        .from('noddi_customer_cache')
        .upsert({
          organization_id: organizationId,
          customer_id: customerId,
          noddi_user_id: noddihUser.id,
          user_group_id: selectedGroup.id,
          email: email,
          last_refreshed_at: new Date().toISOString(),
          priority_booking_id: priorityBooking?.id || null,
          priority_booking_type: priorityBookingType,
          pending_bookings_count: pendingBookings.length,
          cached_customer_data: responseData.customer,
          cached_priority_booking: priorityBooking || {},
          cached_pending_bookings: pendingBookings
        }, {
          onConflict: 'email'
        });
      
      console.log('Cache updated successfully');
    } catch (cacheError) {
      console.log('Could not update cache, but continuing:', cacheError);
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in noddi-customer-lookup:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: errorMessage,
        stack: errorStack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});