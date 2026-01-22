import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SearchRequest {
  widgetKey: string;
  query: string;
  limit?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body: SearchRequest = await req.json();
    const { widgetKey, query, limit = 5 } = body;

    if (!widgetKey || !query) {
      return new Response(
        JSON.stringify({ error: 'Widget key and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch widget configuration to get organization_id
    const { data: widgetConfig, error: configError } = await supabase
      .from('widget_configs')
      .select('organization_id, enable_knowledge_search')
      .eq('widget_key', widgetKey)
      .eq('is_active', true)
      .single();

    if (configError || !widgetConfig) {
      console.error('Widget config not found:', configError);
      return new Response(
        JSON.stringify({ error: 'Widget not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!widgetConfig.enable_knowledge_search) {
      return new Response(
        JSON.stringify({ error: 'Knowledge search is not enabled for this widget' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { organization_id } = widgetConfig;

    // If we have OpenAI API key, use semantic search with embeddings
    if (openaiApiKey) {
      try {
        // Generate embedding for the query
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: query,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const queryEmbedding = embeddingData.data[0].embedding;

          // Use similarity search
          const { data: results, error: searchError } = await supabase.rpc(
            'find_similar_responses',
            {
              query_embedding: queryEmbedding,
              target_organization_id: organization_id,
              match_limit: limit,
            }
          );

          if (!searchError && results && results.length > 0) {
            const formattedResults = results.map((r: any) => ({
              question: r.customer_context,
              answer: r.agent_response,
              category: r.category,
              similarity: r.similarity,
            }));

            return new Response(
              JSON.stringify({ results: formattedResults }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (embeddingError) {
        console.error('Embedding search failed, falling back to text search:', embeddingError);
      }
    }

    // Fallback to basic text search using parameterized queries
    // Run two separate queries instead of .or() with string interpolation
    const searchPattern = `%${query}%`;
    
    // Search in customer_context
    const { data: contextResults, error: contextError } = await supabase
      .from('knowledge_entries')
      .select('id, customer_context, agent_response, category')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .ilike('customer_context', searchPattern)
      .limit(limit);

    // Search in agent_response
    const { data: responseResults, error: responseError } = await supabase
      .from('knowledge_entries')
      .select('id, customer_context, agent_response, category')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .ilike('agent_response', searchPattern)
      .limit(limit);

    if (contextError || responseError) {
      console.error('Text search error:', contextError || responseError);
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Merge and deduplicate results by id
    const seenIds = new Set<string>();
    const textResults: typeof contextResults = [];
    
    for (const r of [...(contextResults || []), ...(responseResults || [])]) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        textResults.push(r);
      }
    }

    const formattedResults = textResults.slice(0, limit).map((r) => ({
      question: r.customer_context,
      answer: r.agent_response,
      category: r.category,
    }));

    return new Response(
      JSON.stringify({ results: formattedResults }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error searching FAQ:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
