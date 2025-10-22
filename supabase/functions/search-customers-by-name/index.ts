import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { searchTerm, organizationId } = await req.json();

    console.log('[Search Customers] Searching for:', searchTerm, 'in org:', organizationId);

    if (!searchTerm || searchTerm.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search term must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search customers by name with intelligent ordering
    const { data: customers, error } = await supabaseClient
      .from('customers')
      .select('id, full_name, email, phone, metadata')
      .eq('organization_id', organizationId)
      .ilike('full_name', `%${searchTerm}%`)
      .order('full_name')
      .limit(10);

    if (error) {
      console.error('[Search Customers] Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[Search Customers] Found', customers?.length || 0, 'customers');

    // Sort results: starts with > contains
    const sorted = (customers || []).sort((a, b) => {
      const aName = a.full_name?.toLowerCase() || '';
      const bName = b.full_name?.toLowerCase() || '';
      const term = searchTerm.toLowerCase();

      const aStarts = aName.startsWith(term);
      const bStarts = bName.startsWith(term);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aName.localeCompare(bName);
    });

    return new Response(
      JSON.stringify(sorted),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Search Customers] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
