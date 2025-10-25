import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organizationId, minQualityScore = 4.0 } = await req.json();
    
    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Missing organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find successful responses with good outcomes
    const { data: candidates, error: candidatesError } = await supabase
      .from('response_tracking')
      .select(`
        *,
        response_outcomes (*)
      `)
      .eq('organization_id', organizationId)
      .is('knowledge_entry_id', null); // Not already promoted

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch candidates' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const promoted = [];

    for (const candidate of candidates || []) {
      const outcomes = candidate.response_outcomes || [];
      
      if (outcomes.length === 0) continue;

      // Calculate quality metrics
      const totalReplies = outcomes.length;
      const resolvedCount = outcomes.filter((o: any) => o.conversation_resolved).length;
      const avgSatisfaction = outcomes.reduce((sum: number, o: any) => sum + (o.customer_satisfaction_score || 0), 0) / totalReplies;
      const avgReplyTime = outcomes.reduce((sum: number, o: any) => sum + (o.reply_time_seconds || 0), 0) / totalReplies;

      // Calculate quality score (0-5 scale)
      const resolutionRate = resolvedCount / totalReplies;
      const qualityScore = (
        (avgSatisfaction * 0.4) + // 40% weight on satisfaction
        (resolutionRate * 5 * 0.4) + // 40% weight on resolution rate
        (Math.min(1, 300 / Math.max(avgReplyTime, 60)) * 5 * 0.2) // 20% weight on quick replies
      );

      // Promote if quality score is high enough and has at least 3 successful outcomes
      if (qualityScore >= minQualityScore && totalReplies >= 3) {
        // Create embedding
        const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: candidate.customer_message,
          }),
        });

        const embeddingData = await embeddingResp.json();
        const embedding = embeddingData?.data?.[0]?.embedding;

        if (!embedding) {
          console.error('Failed to create embedding for candidate:', candidate.id);
          continue;
        }

        // Insert into knowledge_entries
        const { data: knowledgeEntry, error: insertError } = await supabase
          .from('knowledge_entries')
          .insert({
            organization_id: organizationId,
            customer_context: candidate.customer_message,
            agent_response: candidate.agent_response,
            quality_score: qualityScore,
            usage_count: totalReplies,
            acceptance_count: resolvedCount,
            embedding: embedding,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting knowledge entry:', insertError);
          continue;
        }

        // Update response_tracking to link to knowledge entry
        await supabase
          .from('response_tracking')
          .update({ knowledge_entry_id: knowledgeEntry.id })
          .eq('id', candidate.id);

        promoted.push({
          tracking_id: candidate.id,
          knowledge_entry_id: knowledgeEntry.id,
          quality_score: qualityScore,
        });

        console.log(`Promoted response ${candidate.id} to knowledge base with score ${qualityScore.toFixed(2)}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      promoted_count: promoted.length,
      promoted_entries: promoted
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('auto-promote-responses error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to auto-promote responses', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
