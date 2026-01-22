import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");
const noddiToken = Deno.env.get("NODDI_API_TOKEN") || "";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function noddiAuthHeaders(): HeadersInit {
  return {
    "Authorization": `Token ${noddiToken}`,
    "Accept": "application/json",
    "Content-Type": "application/json",
  };
}

const json = (data: any, status = 200) => 
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });

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

    // Validate Noddi API token is configured
    if (!noddiToken) {
      console.error('[noddi-search-by-name] NODDI_API_TOKEN not found in environment');
      return json({ error: 'Noddi API token not configured' }, 500);
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

    console.log(`[noddi-search-by-name] Searching - firstName: "${firstName}", lastName: "${lastName || 'not provided'}"`);

    // Call Noddi search API using filter parameters
    const searchParams = new URLSearchParams();
    if (firstName) searchParams.append('first_name', firstName);
    if (lastName) searchParams.append('last_name', lastName);

    const searchUrl = `${API_BASE}/v1/users/?${searchParams}`;
    console.log(`[noddi-search-by-name] Request URL: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      headers: noddiAuthHeaders()
    });

    console.log(`[noddi-search-by-name] Response status: ${searchResponse.status}`);

    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      console.error(`[noddi-search-by-name] Search failed:`, errorBody);
      return json({ 
        error: 'Noddi search failed', 
        status: searchResponse.status,
        details: errorBody
      }, 500);
    }

    const searchData = await searchResponse.json();
    const users = Array.isArray(searchData) ? searchData : (searchData.results || []);
    console.log(`[noddi-search-by-name] Found ${users.length} users`);

    // For each user, check if they exist in our local customers table
    const enriched = await Promise.all(
      (users || []).map(async (user: any) => {
        // Sanitize external data
        const userEmail = (user.email || '').toLowerCase().trim();
        const userPhone = (user.phone || '').trim();

        // Check if customer exists locally using parameterized queries (no string interpolation)
        let localCustomer = null;
        
        if (userEmail) {
          // Try to find by email first using parameterized .ilike()
          const { data: byEmail } = await supabaseClient
            .from('customers')
            .select('id')
            .eq('organization_id', organizationId)
            .ilike('email', userEmail)
            .maybeSingle();
          
          localCustomer = byEmail;
        }
        
        // If not found by email and we have a phone, try phone
        if (!localCustomer && userPhone) {
          const { data: byPhone } = await supabaseClient
            .from('customers')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('phone', userPhone)
            .maybeSingle();
          
          localCustomer = byPhone;
        }

        return {
          noddi_user_id: user.id,
          full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Unknown',
          email: null, // Don't return Noddi email as primary - it should never overwrite customer email
          noddi_email: user.email, // Return Noddi email separately in metadata
          phone: user.phone,
          user_group_id: user.user_groups?.[0]?.id || null,
          local_customer_id: localCustomer?.id || null,
          is_new: !localCustomer
        };
      })
    );

    console.log('[noddi-search-by-name] Returning', enriched.length, 'results');

    return json({ results: enriched });

  } catch (error) {
    console.error('[noddi-search-by-name] Error:', error);
    return json({ error: error.message }, 500);
  }
});
