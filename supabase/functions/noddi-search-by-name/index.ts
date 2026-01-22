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
        const userEmail = user.email?.toLowerCase();
        const userPhone = user.phone;

        // Check if customer exists locally
        const { data: localCustomer } = await supabaseClient
          .from('customers')
          .select('id')
          .eq('organization_id', organizationId)
          .or(`email.ilike.${userEmail},phone.eq.${userPhone}`)
          .maybeSingle();

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
