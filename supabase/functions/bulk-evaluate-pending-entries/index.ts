import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EVALUATION_PROMPT = `You are a knowledge-base quality evaluator for a customer support system for Noddi, a tire change and car service company in Norway.

Score the following customer-support Q&A pair on four dimensions (each 0-5, integers only):

1. **Relevance** – Is this a genuine customer support interaction about tire services, car maintenance, bookings, delivery, or related topics? (0 = spam/irrelevant, 5 = core business topic)
2. **Accuracy** – Is the agent's response factually correct and complete? (0 = wrong/misleading, 5 = thorough and correct)
3. **Specificity** – Is the Q&A specific enough to help an AI answer similar future questions? (0 = too vague/generic, 5 = clear, concrete scenario)
4. **Actionability** – Does the response contain a clear, reusable answer pattern? (0 = no useful pattern, 5 = directly reusable template)

Respond with ONLY valid JSON, no markdown:
{"relevance": <0-5>, "accuracy": <0-5>, "specificity": <0-5>, "actionability": <0-5>, "reasoning": "<1-2 sentences>"}`;

interface EvaluationResult {
  relevance: number;
  accuracy: number;
  specificity: number;
  actionability: number;
  reasoning: string;
}

async function evaluateEntry(
  openaiKey: string,
  customerContext: string,
  agentResponse: string,
): Promise<EvaluationResult> {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      max_tokens: 200,
      messages: [
        { role: 'system', content: EVALUATION_PROMPT },
        {
          role: 'user',
          content: `CUSTOMER CONTEXT:\n${customerContext.slice(0, 2000)}\n\nAGENT RESPONSE:\n${agentResponse.slice(0, 2000)}`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty response from OpenAI');

  const parsed = JSON.parse(content);

  // Validate scores are integers 0-5
  for (const key of ['relevance', 'accuracy', 'specificity', 'actionability']) {
    const val = parsed[key];
    if (typeof val !== 'number' || val < 0 || val > 5) {
      throw new Error(`Invalid score for ${key}: ${val}`);
    }
    parsed[key] = Math.round(val);
  }

  return parsed as EvaluationResult;
}

async function generateEmbedding(openaiKey: string, text: string): Promise<number[] | null> {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });

  if (!resp.ok) {
    console.error('[generateEmbedding] OpenAI error:', resp.status);
    return null;
  }

  const data = await resp.json();
  return data?.data?.[0]?.embedding ?? null;
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
      return new Response(JSON.stringify({ error: 'Missing configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { organizationId, batchSize = 50, dryRun = false } = await req.json();

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'Missing organizationId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch unevaluated pending entries
    const { data: entries, error: fetchError } = await supabase
      .from('knowledge_pending_entries')
      .select('id, customer_context, agent_response, organization_id, source_message_id')
      .eq('organization_id', organizationId)
      .eq('review_status', 'pending')
      .is('evaluation_score', null)
      .order('created_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      console.error('[bulk-evaluate] Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch entries', detail: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({
        status: 'completed',
        message: 'No more entries to evaluate',
        evaluated: 0, promoted: 0, flagged: 0, archived: 0, errors: 0,
        hasMore: false,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pre-fetch existing knowledge_entries customer_contexts for dedup
    const { data: existingEntries } = await supabase
      .from('knowledge_entries')
      .select('customer_context')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const existingContexts = new Set(
      (existingEntries || []).map((e: any) => e.customer_context?.trim().toLowerCase()),
    );

    let promoted = 0;
    let flagged = 0;
    let archived = 0;
    let errors = 0;
    const results: Array<{ id: string; score: number; action: string }> = [];

    for (const entry of entries) {
      try {
        const evaluation = await evaluateEntry(
          OPENAI_API_KEY,
          entry.customer_context,
          entry.agent_response,
        );

        const composite =
          (evaluation.relevance + evaluation.accuracy + evaluation.specificity + evaluation.actionability) / 20;

        const now = new Date().toISOString();

        if (dryRun) {
          const action = composite > 0.7 ? 'promote' : composite >= 0.4 ? 'flag' : 'archive';
          results.push({ id: entry.id, score: composite, action });
          continue;
        }

        if (composite > 0.7) {
          // Check for duplicate before promoting
          const isDuplicate = existingContexts.has(entry.customer_context?.trim().toLowerCase());

          if (isDuplicate) {
            // Mark as rejected (duplicate) instead of promoting
            await supabase
              .from('knowledge_pending_entries')
              .update({
                evaluation_score: composite,
                evaluation_notes: { ...evaluation, skipped_reason: 'duplicate_exists' },
                evaluated_at: now,
                review_status: 'rejected',
              })
              .eq('id', entry.id);

            archived++;
            results.push({ id: entry.id, score: composite, action: 'duplicate_archived' });
            continue;
          }

          // Generate embedding for promotion
          const embedding = await generateEmbedding(OPENAI_API_KEY, entry.customer_context);

          if (!embedding) {
            // Still update evaluation but don't promote if embedding fails
            await supabase
              .from('knowledge_pending_entries')
              .update({
                evaluation_score: composite,
                evaluation_notes: { ...evaluation, embedding_failed: true },
                evaluated_at: now,
              })
              .eq('id', entry.id);

            errors++;
            results.push({ id: entry.id, score: composite, action: 'embedding_failed' });
            continue;
          }

          // Insert into knowledge_entries
          const { error: insertError } = await supabase
            .from('knowledge_entries')
            .insert({
              organization_id: entry.organization_id,
              customer_context: entry.customer_context,
              agent_response: entry.agent_response,
              embedding,
              quality_score: composite * 5,
              created_from_message_id: entry.source_message_id,
              is_active: true,
              is_manually_curated: false,
              usage_count: 0,
              acceptance_count: 0,
            });

          if (insertError) {
            console.error('[bulk-evaluate] Insert error:', insertError);
            errors++;
            results.push({ id: entry.id, score: composite, action: 'insert_failed' });
            continue;
          }

          // Add to dedup set so later entries in same batch don't duplicate
          existingContexts.add(entry.customer_context?.trim().toLowerCase());

          // Mark pending entry as approved
          await supabase
            .from('knowledge_pending_entries')
            .update({
              evaluation_score: composite,
              evaluation_notes: evaluation,
              evaluated_at: now,
              review_status: 'approved',
            })
            .eq('id', entry.id);

          promoted++;
          results.push({ id: entry.id, score: composite, action: 'promoted' });
        } else if (composite >= 0.4) {
          // Flag for human review — leave as pending, store scores
          await supabase
            .from('knowledge_pending_entries')
            .update({
              evaluation_score: composite,
              evaluation_notes: evaluation,
              evaluated_at: now,
            })
            .eq('id', entry.id);

          flagged++;
          results.push({ id: entry.id, score: composite, action: 'flagged' });
        } else {
          // Archive — mark as rejected
          await supabase
            .from('knowledge_pending_entries')
            .update({
              evaluation_score: composite,
              evaluation_notes: evaluation,
              evaluated_at: now,
              review_status: 'rejected',
            })
            .eq('id', entry.id);

          archived++;
          results.push({ id: entry.id, score: composite, action: 'archived' });
        }
      } catch (err) {
        console.error(`[bulk-evaluate] Error evaluating entry ${entry.id}:`, err);
        errors++;
        results.push({ id: entry.id, score: -1, action: 'error' });
      }
    }

    // Check if there are more entries to process
    const { count: remaining } = await supabase
      .from('knowledge_pending_entries')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('review_status', 'pending')
      .is('evaluation_score', null);

    const hasMore = (remaining ?? 0) > 0;

    console.log(`[bulk-evaluate] Batch done: ${promoted} promoted, ${flagged} flagged, ${archived} archived, ${errors} errors. ${remaining ?? '?'} remaining.`);

    return new Response(JSON.stringify({
      status: hasMore ? 'in_progress' : 'completed',
      evaluated: entries.length,
      promoted,
      flagged,
      archived,
      errors,
      remaining: remaining ?? 0,
      hasMore,
      dryRun,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[bulk-evaluate] Fatal error:', err);
    return new Response(JSON.stringify({
      error: 'Evaluation failed',
      detail: err instanceof Error ? err.message : String(err),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
