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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { responseTrackingId } = await req.json();
    
    if (!responseTrackingId) {
      return new Response(JSON.stringify({ error: 'Missing responseTrackingId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the response tracking record
    const { data: trackingRecord, error: trackingError } = await supabase
      .from('response_tracking')
      .select('*')
      .eq('id', responseTrackingId)
      .single();

    if (trackingError || !trackingRecord) {
      return new Response(JSON.stringify({ error: 'Response tracking record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create embedding for the customer message
    const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: String(trackingRecord.customer_message || '').slice(0, 8000),
      }),
    });

    const embeddingData = await embeddingResp.json();
    
    if (!embeddingResp.ok) {
      console.error('OpenAI embedding error:', embeddingData);
      return new Response(JSON.stringify({ error: 'Failed to create embedding' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const embedding = embeddingData?.data?.[0]?.embedding;
    if (!embedding) {
      return new Response(JSON.stringify({ error: 'No embedding returned' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create knowledge entry
    const { data: knowledgeEntry, error: insertError } = await supabase
      .from('knowledge_entries')
      .insert({
        organization_id: trackingRecord.organization_id,
        customer_context: trackingRecord.customer_message,
        agent_response: trackingRecord.agent_response,
        embedding: embedding,
        created_from_message_id: trackingRecord.message_id,
        created_by_id: trackingRecord.agent_id,
        is_manually_curated: false,
        quality_score: 0.5, // Initial score
        usage_count: 1,
        acceptance_count: 1,
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create knowledge entry:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to create knowledge entry', detail: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      knowledgeEntry: knowledgeEntry 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('promote-response error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to promote response', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
