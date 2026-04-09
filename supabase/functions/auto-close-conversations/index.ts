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

    // ── Memory extraction: Agent conversations ──────────────
    // Find closed agent conversations that haven't had memories extracted yet
    let agentMemoryCount = 0;
    try {
      const { data: closedConvs } = await supabase
        .from('conversations')
        .select('id, organization_id')
        .eq('status', 'closed')
        .is('memories_extracted_at', null)
        .order('updated_at', { ascending: true })
        .limit(10);

      if (closedConvs && closedConvs.length > 0) {
        console.log(`[Auto-Close] Found ${closedConvs.length} agent conversations needing memory extraction`);
        for (const conv of closedConvs) {
          supabase.functions.invoke('extract-customer-memories', {
            body: {
              conversationId: conv.id,
              organizationId: conv.organization_id,
              conversationType: 'agent',
            },
          }).catch((err: any) =>
            console.warn(`[Auto-Close] Memory extraction failed for agent conv ${conv.id}:`, err)
          );
          agentMemoryCount++;
        }
      }
    } catch (e) {
      console.warn('[Auto-Close] Agent memory extraction query failed:', e);
    }

    // ── Memory extraction: Widget AI conversations ──────────
    // Find stale AI conversations (no message in 30+ min) that haven't been extracted
    let widgetMemoryCount = 0;
    try {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      const { data: staleAiConvs } = await supabase
        .from('widget_ai_conversations')
        .select('id, organization_id')
        .is('memories_extracted_at', null)
        .lt('updated_at', thirtyMinAgo)
        .not('visitor_phone', 'is', null)  // Must have some identifier
        .order('updated_at', { ascending: true })
        .limit(10);

      // Also get ones with email but no phone
      const { data: staleAiConvsEmail } = await supabase
        .from('widget_ai_conversations')
        .select('id, organization_id')
        .is('memories_extracted_at', null)
        .lt('updated_at', thirtyMinAgo)
        .is('visitor_phone', null)
        .not('visitor_email', 'is', null)
        .order('updated_at', { ascending: true })
        .limit(10);

      const allStale = [
        ...(staleAiConvs || []),
        ...(staleAiConvsEmail || []),
      ].slice(0, 10);

      if (allStale.length > 0) {
        console.log(`[Auto-Close] Found ${allStale.length} widget AI conversations needing memory extraction`);
        for (const conv of allStale) {
          supabase.functions.invoke('extract-customer-memories', {
            body: {
              conversationId: conv.id,
              organizationId: conv.organization_id,
              conversationType: 'widget_ai',
            },
          }).catch((err: any) =>
            console.warn(`[Auto-Close] Memory extraction failed for widget conv ${conv.id}:`, err)
          );
          widgetMemoryCount++;
        }
      }
    } catch (e) {
      console.warn('[Auto-Close] Widget AI memory extraction query failed:', e);
    }

    if (agentMemoryCount > 0 || widgetMemoryCount > 0) {
      console.log(`[Auto-Close] Triggered memory extraction: ${agentMemoryCount} agent, ${widgetMemoryCount} widget AI`);
    }

    // ── Knowledge freshness check: deactivate stale entries ──
    let staleCount = 0;
    try {
      const stalenessThresholds: Record<string, number> = {
        pricing: 1, procedures: 30, faq: 90,
      };
      for (const [category, days] of Object.entries(stalenessThresholds)) {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const { data: stale } = await supabase
          .from('knowledge_entries')
          .select('id')
          .eq('is_active', true)
          .eq('staleness_category', category)
          .lt('last_verified_at', cutoff)
          .limit(20);

        if (stale && stale.length > 0) {
          // Mark as inactive (they'll stop appearing in search results)
          await supabase
            .from('knowledge_entries')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .in('id', stale.map((s: any) => s.id));
          staleCount += stale.length;
          console.log(`[Auto-Close] Deactivated ${stale.length} stale '${category}' knowledge entries`);
        }
      }
    } catch (e) {
      console.warn('[Auto-Close] Staleness check failed:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        closed_count: closedCount,
        memory_extraction: { agent: agentMemoryCount, widget_ai: widgetMemoryCount },
        stale_knowledge: staleCount,
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
