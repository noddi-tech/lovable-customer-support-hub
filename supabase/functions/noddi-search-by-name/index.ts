import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const noddiApiKey = Deno.env.get("NODDI_API_KEY") || "";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function noddiAuthHeaders(): HeadersInit {
  return {
    "Authorization": `Api-Key ${noddiApiKey}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

const json = (data: any, status = 200) => 
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });

function isReallyUnpaid(booking: any): boolean {
  const status = booking?.payment_status || booking?.order?.payment_status || '';
  const unpaidLabels = ['unpaid', 'pending', 'requires payment', 'overdue'];
  return unpaidLabels.some(label => status.toLowerCase().includes(label));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { firstName, lastName, organizationId } = await req.json();

    if (!firstName && !lastName) {
      return json({ error: 'firstName or lastName required' }, 400);
    }

    if (!organizationId) {
      return json({ error: 'organizationId required' }, 400);
    }

    // Verify user belongs to the organization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (profile?.organization_id !== organizationId) {
      return json({ error: 'Organization mismatch' }, 403);
    }

    console.log(`[noddi-search-by-name] Searching for: ${firstName} ${lastName}`);

    // Call Noddi search API
    const searchParams = new URLSearchParams();
    if (firstName) searchParams.append('first_name', firstName);
    if (lastName) searchParams.append('last_name', lastName);

    const searchResponse = await fetch(`${API_BASE}/v1/users/search?${searchParams}`, {
      headers: noddiAuthHeaders()
    });

    if (!searchResponse.ok) {
      console.error(`[noddi-search-by-name] Search failed: ${searchResponse.status}`);
      return json({ error: 'Noddi search failed', status: searchResponse.status }, 500);
    }

    const searchData = await searchResponse.json();
    const users = searchData.results || [];

    console.log(`[noddi-search-by-name] Found ${users.length} users`);

    // Enrich each user with booking data
    const enrichedResults = await Promise.all(
      users.map(async (user: any) => {
        try {
          // Fetch user's bookings
          const bookingsResponse = await fetch(`${API_BASE}/v1/users/${user.id}/bookings/`, {
            headers: noddiAuthHeaders()
          });

          let bookings = [];
          let unpaidBookings = [];
          let priorityBooking = null;

          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            bookings = bookingsData.results || [];

            // Find priority booking (upcoming or most recent completed)
            const upcoming = bookings.find((b: any) => 
              b.status === 'scheduled' || b.status === 'pending'
            );
            const completed = bookings
              .filter((b: any) => b.status === 'completed')
              .sort((a: any, b: any) => 
                new Date(b.completed_at || b.updated_at).getTime() - 
                new Date(a.completed_at || a.updated_at).getTime()
              )[0];
            
            priorityBooking = upcoming || completed || null;

            // Find unpaid bookings
            unpaidBookings = bookings.filter(isReallyUnpaid);
          }

          // Check if customer exists locally
          const { data: localCustomer } = await supabaseClient
            .from('customers')
            .select('id')
            .eq('organization_id', organizationId)
            .or(`email.eq.${user.email},phone.eq.${user.phone || ''}`)
            .limit(1)
            .single();

          // Get user_group data
          const userGroup = user.user_groups?.[0] || null;

          return {
            noddi_user: user,
            noddi_user_group: userGroup,
            local_customer_id: localCustomer?.id || null,
            bookings_summary: {
              priority_booking: priorityBooking,
              unpaid_count: unpaidBookings.length,
              unpaid_bookings: unpaidBookings,
              total_bookings: bookings.length
            }
          };
        } catch (error) {
          console.error(`[noddi-search-by-name] Error enriching user ${user.id}:`, error);
          return {
            noddi_user: user,
            noddi_user_group: user.user_groups?.[0] || null,
            local_customer_id: null,
            bookings_summary: {
              priority_booking: null,
              unpaid_count: 0,
              unpaid_bookings: [],
              total_bookings: 0
            }
          };
        }
      })
    );

    return json({ results: enrichedResults });

  } catch (error) {
    console.error('[noddi-search-by-name] Error:', error);
    return json({ error: error.message }, 500);
  }
});
