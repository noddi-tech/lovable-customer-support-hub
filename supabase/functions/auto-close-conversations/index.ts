import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Auto-Close] Starting auto-close job...');

    // Call the auto-close function
    const { data, error } = await supabase.rpc('auto_close_inactive_conversations');

    if (error) {
      console.error('[Auto-Close] Error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const closedCount = data?.[0]?.closed_count || 0;
    console.log(`[Auto-Close] Successfully closed ${closedCount} conversations`);

    // Also calculate SLA breach times for open conversations
    const { error: slaError } = await supabase.rpc('calculate_sla_breach');
    
    if (slaError) {
      console.error('[Auto-Close] Error calculating SLA:', slaError);
    } else {
      console.log('[Auto-Close] SLA breach times updated');
    }

    // Auto-abandon inactive chat sessions (no heartbeat for 2 minutes)
    const { data: abandonData, error: abandonError } = await supabase.rpc('auto_abandon_inactive_chat_sessions');
    
    if (abandonError) {
      console.error('[Auto-Close] Error abandoning chat sessions:', abandonError);
    } else {
      const abandonedCount = abandonData?.[0]?.abandoned_count || 0;
      console.log(`[Auto-Close] Auto-abandoned ${abandonedCount} inactive chat sessions`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        closed_count: closedCount,
        message: `Auto-closed ${closedCount} inactive conversations`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[Auto-Close] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
