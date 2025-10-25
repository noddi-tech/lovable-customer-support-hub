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

    const { customerMessage, organizationId, limit = 5 } = await req.json();
    
    if (!customerMessage || !organizationId) {
      return new Response(JSON.stringify({ error: 'Missing customerMessage or organizationId' }), {
        status: 400,
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
        input: String(customerMessage).slice(0, 8000),
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

    // Search for similar responses using the find_similar_responses function
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: similarResponses, error: searchError } = await supabase.rpc(
      'find_similar_responses',
      {
        query_embedding: embedding,
        org_id: organizationId,
        match_threshold: 0.7,
        match_count: limit,
      }
    );

    if (searchError) {
      console.error('Knowledge search error:', searchError);
      return new Response(JSON.stringify({ error: 'Search failed', detail: searchError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      results: similarResponses || [],
      count: similarResponses?.length || 0 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('search-knowledge error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to search knowledge', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
