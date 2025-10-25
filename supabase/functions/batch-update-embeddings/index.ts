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

    const { organizationId, batchSize = 50 } = await req.json();
    
    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Missing organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find knowledge entries without embeddings or with outdated embeddings
    const { data: entries, error: fetchError } = await supabase
      .from('knowledge_entries')
      .select('id, customer_context')
      .eq('organization_id', organizationId)
      .or('embedding.is.null,updated_at.gt.created_at')
      .limit(batchSize);

    if (fetchError) {
      console.error('Error fetching entries:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch entries' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const updated = [];
    const failed = [];

    for (const entry of entries || []) {
      try {
        // Create embedding
        const embeddingResp = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: entry.customer_context.slice(0, 8000),
          }),
        });

        const embeddingData = await embeddingResp.json();
        const embedding = embeddingData?.data?.[0]?.embedding;

        if (!embedding) {
          failed.push({ id: entry.id, reason: 'No embedding returned' });
          continue;
        }

        // Update entry with new embedding
        const { error: updateError } = await supabase
          .from('knowledge_entries')
          .update({ embedding })
          .eq('id', entry.id);

        if (updateError) {
          failed.push({ id: entry.id, reason: updateError.message });
        } else {
          updated.push(entry.id);
        }
      } catch (error) {
        failed.push({ 
          id: entry.id, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    console.log(`Batch update complete: ${updated.length} updated, ${failed.length} failed`);

    return new Response(JSON.stringify({ 
      success: true,
      updated_count: updated.length,
      failed_count: failed.length,
      updated_ids: updated,
      failed_entries: failed
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('batch-update-embeddings error', err);
    return new Response(JSON.stringify({ 
      error: 'Failed to batch update embeddings', 
      detail: err instanceof Error ? err.message : String(err) 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
