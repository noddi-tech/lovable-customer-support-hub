import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { responseTrackingId, backfill } = await req.json();

    if (backfill) {
      const count = await processBackfill(supabase, OPENAI_API_KEY);
      return new Response(
        JSON.stringify({ success: true, processed: count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!responseTrackingId) {
      return new Response(
        JSON.stringify({ error: 'responseTrackingId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const result = await processOne(supabase, OPENAI_API_KEY, responseTrackingId);
    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[classify-agent-edit] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Process a single response_tracking record ──

async function processOne(
  supabase: any,
  openaiKey: string,
  responseTrackingId: string,
): Promise<{ skipped?: string; inserted?: boolean }> {
  const { data: rt, error } = await supabase
    .from('response_tracking')
    .select('id, organization_id, customer_message, agent_response, original_ai_suggestion, was_refined')
    .eq('id', responseTrackingId)
    .single();

  if (error || !rt) {
    console.warn(`[classify-agent-edit] Record not found: ${responseTrackingId}`);
    return { skipped: 'not_found' };
  }

  if (!rt.was_refined || !rt.original_ai_suggestion || !rt.customer_message) {
    return { skipped: 'missing_fields' };
  }

  // Check if already processed
  const { data: existing } = await supabase
    .from('preference_pairs')
    .select('id')
    .eq('response_tracking_id', responseTrackingId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { skipped: 'already_processed' };
  }

  const editDist = normalizedLevenshtein(rt.original_ai_suggestion, rt.agent_response);

  if (editDist < 0.10) {
    console.log(`[classify-agent-edit] Skipping trivial edit (${(editDist * 100).toFixed(1)}%): ${responseTrackingId}`);
    return { skipped: 'trivial_edit' };
  }

  const category = await classifyEdit(openaiKey, rt.customer_message, rt.original_ai_suggestion, rt.agent_response);

  const { error: insertErr } = await supabase.from('preference_pairs').insert({
    organization_id: rt.organization_id,
    customer_message: rt.customer_message,
    chosen_response: rt.agent_response,
    rejected_response: rt.original_ai_suggestion,
    edit_category: category,
    edit_distance: editDist,
    response_tracking_id: rt.id,
  });

  if (insertErr) {
    console.error('[classify-agent-edit] Insert error:', insertErr);
    return { skipped: 'insert_error' };
  }

  console.log(`[classify-agent-edit] Created preference pair: category=${category}, dist=${(editDist * 100).toFixed(1)}%`);
  return { inserted: true };
}

// ── Backfill mode: process all unprocessed refined records ──

async function processBackfill(supabase: any, openaiKey: string): Promise<number> {
  // Find response_tracking records with was_refined=true that don't have a preference_pair yet
  const { data: candidates, error } = await supabase
    .from('response_tracking')
    .select('id')
    .eq('was_refined', true)
    .not('original_ai_suggestion', 'is', null)
    .not('customer_message', 'is', null)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error || !candidates || candidates.length === 0) {
    console.log('[classify-agent-edit] Backfill: no candidates found');
    return 0;
  }

  let processed = 0;
  for (const c of candidates) {
    const result = await processOne(supabase, openaiKey, c.id);
    if (result.inserted) processed++;
  }

  console.log(`[classify-agent-edit] Backfill complete: ${processed}/${candidates.length} processed`);
  return processed;
}

// ── GPT-4o-mini classification ──

async function classifyEdit(
  openaiKey: string,
  customerMessage: string,
  originalSuggestion: string,
  agentResponse: string,
): Promise<string> {
  const prompt = `You are classifying how a human agent edited an AI-generated customer support reply.

Customer message:
${customerMessage.slice(0, 500)}

Original AI suggestion:
${originalSuggestion.slice(0, 1000)}

Agent's edited version:
${agentResponse.slice(0, 1000)}

Classify the primary reason for the edit into exactly one category:
- tone: Changed formality, warmth, empathy, or communication style
- factual: Corrected wrong information or added missing facts
- policy: Aligned with company policy the AI didn't know
- completeness: Added missing steps, details, or context
- format: Changed structure, length, or formatting without changing meaning

Respond with ONLY the category name (one word).`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 10,
        temperature: 0,
      }),
    });

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
    const valid = ['tone', 'factual', 'policy', 'completeness', 'format'];
    return valid.includes(raw) ? raw : 'completeness'; // default fallback
  } catch (err) {
    console.warn('[classify-agent-edit] GPT classification failed:', err);
    return 'completeness';
  }
}

// ── Normalized Levenshtein distance ──

function normalizedLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;

  const m = a.length;
  const n = b.length;

  // Use two-row optimization for memory efficiency
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n] / maxLen;
}
