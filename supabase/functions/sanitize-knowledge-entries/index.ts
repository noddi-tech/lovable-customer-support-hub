import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { sanitizeTextForKnowledge } from '../_shared/sanitize-pii.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateEmbedding(
  text: string,
  openaiApiKey: string,
): Promise<number[] | null> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });

  if (!resp.ok) {
    console.warn('[sanitize] Embedding generation failed:', resp.status);
    return null;
  }

  const data = await resp.json();
  return data.data?.[0]?.embedding || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const batchSize = body.batchSize || 20;
    const dryRun = body.dryRun || false;
    const organizationId = body.organizationId || null; // Optional filter

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch unsanitized entries
    let query = supabase
      .from('knowledge_entries')
      .select('id, customer_context, agent_response, organization_id')
      .eq('is_active', true)
      .is('sanitized_at', null)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: entries, error: fetchErr } = await query;

    if (fetchErr) {
      console.error('[sanitize] Fetch error:', fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!entries || entries.length === 0) {
      console.log('[sanitize] No unsanitized entries found');
      return new Response(JSON.stringify({
        ok: true,
        processed: 0,
        remaining: 0,
        message: 'All entries are sanitized',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const CONCURRENCY = body.concurrency || 5;
    console.log(`[sanitize] Processing ${entries.length} entries (dryRun=${dryRun}, concurrency=${CONCURRENCY})`);

    let processed = 0;
    let failed = 0;
    const results: any[] = [];

    // Process a single entry
    async function processEntry(entry: any): Promise<void> {
      try {
        // Sanitize both fields in parallel
        const [sanitizedContext, sanitizedResponse] = await Promise.all([
          sanitizeTextForKnowledge(entry.customer_context || '', OPENAI_API_KEY!),
          sanitizeTextForKnowledge(entry.agent_response || '', OPENAI_API_KEY!),
        ]);

        const contextChanged = sanitizedContext !== entry.customer_context;
        const responseChanged = sanitizedResponse !== entry.agent_response;

        if (dryRun) {
          results.push({
            id: entry.id,
            contextChanged,
            responseChanged,
            original_context: entry.customer_context?.slice(0, 100),
            sanitized_context: sanitizedContext.slice(0, 100),
            original_response: entry.agent_response?.slice(0, 100),
            sanitized_response: sanitizedResponse.slice(0, 100),
          });
          processed++;
          return;
        }

        // Generate new embedding from sanitized text
        const embeddingInput = `${sanitizedContext} ${sanitizedResponse}`;
        const newEmbedding = await generateEmbedding(embeddingInput, OPENAI_API_KEY!);

        // Update the entry
        const updateData: any = {
          customer_context: sanitizedContext,
          agent_response: sanitizedResponse,
          sanitized_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (newEmbedding) {
          updateData.embedding = newEmbedding;
        }

        const { error: updateErr } = await supabase
          .from('knowledge_entries')
          .update(updateData)
          .eq('id', entry.id);

        if (updateErr) {
          console.error(`[sanitize] Update failed for ${entry.id}:`, updateErr);
          failed++;
          return;
        }

        processed++;
        if (contextChanged || responseChanged) {
          console.log(`[sanitize] Sanitized entry ${entry.id} (ctx:${contextChanged} resp:${responseChanged})`);
        } else {
          console.log(`[sanitize] Entry ${entry.id} — no PII, marked sanitized`);
        }
      } catch (e) {
        console.error(`[sanitize] Error processing entry ${entry.id}:`, e);
        failed++;
      }
    }

    // Process entries with concurrency limit
    const queue = [...entries];
    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
      workers.push((async () => {
        while (queue.length > 0) {
          const entry = queue.shift();
          if (entry) await processEntry(entry);
        }
      })());
    }
    await Promise.all(workers);

    // Count remaining
    let remainingQuery = supabase
      .from('knowledge_entries')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('sanitized_at', null);

    if (organizationId) {
      remainingQuery = remainingQuery.eq('organization_id', organizationId);
    }

    const { count: remaining } = await remainingQuery;

    const response: any = {
      ok: true,
      processed,
      failed,
      remaining: dryRun ? entries.length : (remaining || 0),
      message: dryRun
        ? `Dry run complete. ${processed} entries analyzed.`
        : `Sanitized ${processed} entries, ${failed} failed, ${remaining || 0} remaining.`,
    };

    if (dryRun) {
      response.samples = results.slice(0, 5);
    }

    console.log(`[sanitize] ${response.message}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[sanitize] Unexpected error:', err);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      detail: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
