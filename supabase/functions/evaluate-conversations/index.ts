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

    console.log('[evaluate-conversations] Starting nightly evaluation...');

    // Find conversations from last 24h not yet evaluated
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: candidates, error: fetchErr } = await supabase
      .from('widget_ai_conversations')
      .select('id, organization_id')
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (fetchErr) {
      console.error('[evaluate-conversations] Fetch error:', fetchErr);
      return errorResponse(fetchErr.message);
    }

    if (!candidates || candidates.length === 0) {
      console.log('[evaluate-conversations] No conversations to evaluate');
      return jsonResponse({ success: true, evaluated: 0 });
    }

    // Filter out already-evaluated conversations
    const candidateIds = candidates.map((c: any) => c.id);
    const { data: alreadyEvaluated } = await supabase
      .from('conversation_evaluations')
      .select('conversation_id')
      .in('conversation_id', candidateIds);

    const evaluatedSet = new Set((alreadyEvaluated || []).map((e: any) => e.conversation_id));
    let toEvaluate = candidates.filter((c: any) => !evaluatedSet.has(c.id));

    console.log(`[evaluate-conversations] ${toEvaluate.length} unevaluated out of ${candidates.length} total`);

    // Sampling logic: if > 100 conversations, prioritize flagged + negative feedback + random 50%
    if (toEvaluate.length > 100) {
      toEvaluate = await applySampling(supabase, toEvaluate);
      console.log(`[evaluate-conversations] Sampled down to ${toEvaluate.length} conversations`);
    }

    let evaluated = 0;
    const scores: number[] = [];

    for (const conv of toEvaluate) {
      try {
        const result = await evaluateConversation(supabase, OPENAI_API_KEY, conv.id, conv.organization_id);
        if (result) {
          scores.push(result.composite);
          evaluated++;
        }
      } catch (e) {
        console.warn(`[evaluate-conversations] Failed for ${conv.id}:`, e);
      }
    }

    // Flag bottom 10% for review
    if (scores.length >= 5) {
      const sorted = [...scores].sort((a, b) => a - b);
      const threshold = sorted[Math.floor(sorted.length * 0.1)];

      const { error: flagErr } = await supabase
        .from('conversation_evaluations')
        .update({ flagged_for_review: true })
        .lte('composite_score', threshold)
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // only this batch
        .eq('flagged_for_review', false);

      if (flagErr) {
        console.warn('[evaluate-conversations] Flagging error:', flagErr);
      } else {
        console.log(`[evaluate-conversations] Flagged conversations with composite <= ${threshold.toFixed(3)}`);
      }
    }

    console.log(`[evaluate-conversations] Done: ${evaluated} evaluated`);
    return jsonResponse({ success: true, evaluated, total_candidates: candidates.length });
  } catch (err) {
    console.error('[evaluate-conversations] Error:', err);
    return errorResponse('Internal error');
  }
});

// ── Evaluate a single conversation ──

async function evaluateConversation(
  supabase: any,
  openaiKey: string,
  conversationId: string,
  organizationId: string,
): Promise<{ composite: number } | null> {
  // Load messages
  const { data: messages } = await supabase
    .from('widget_ai_messages')
    .select('role, content, tools_used, quality_flag, quality_check_passed')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(30);

  if (!messages || messages.length < 2) return null;

  // Build transcript for evaluation
  const transcript = messages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => `${m.role === 'user' ? 'Customer' : 'AI'}: ${m.content.slice(0, 500)}`)
    .join('\n\n');

  // Note any Tier 1 quality flags
  const flags = messages
    .filter((m: any) => m.quality_flag)
    .map((m: any) => m.quality_flag);
  const flagNote = flags.length > 0 ? `\nTier 1 quality flags found: ${flags.join('; ')}` : '';

  const prompt = `You are evaluating an AI customer support conversation. Score each dimension from 0 to 5 (integers only).

CONVERSATION:
${transcript.slice(0, 3000)}
${flagNote}

SCORING DIMENSIONS:
1. accuracy (0-5): Are all facts, booking details, prices, and references correct? No hallucinations?
2. helpfulness (0-5): Did the AI effectively address the customer's needs?
3. tone (0-5): Was the tone appropriate — friendly, professional, empathetic?
4. completeness (0-5): Were all parts of the customer's question answered?
5. policy_compliance (0-5): Did the AI follow proper procedures (verification before account access, confirmation before actions)?

Also provide a brief evaluation note (1-2 sentences).

Respond in EXACTLY this JSON format:
{"accuracy":N,"helpfulness":N,"tone":N,"completeness":N,"policy":N,"notes":"..."}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0,
      }),
    });

    const data = await res.json();
    const raw = (data.choices?.[0]?.message?.content || '').trim();

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = raw.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    const scores = JSON.parse(jsonStr);

    const accuracy = clamp(scores.accuracy ?? 0, 0, 5);
    const helpfulness = clamp(scores.helpfulness ?? 0, 0, 5);
    const tone = clamp(scores.tone ?? 0, 0, 5);
    const completeness = clamp(scores.completeness ?? 0, 0, 5);
    const policy = clamp(scores.policy ?? 0, 0, 5);
    const composite = (accuracy + helpfulness + tone + completeness + policy) / 25;

    const { error: insertErr } = await supabase.from('conversation_evaluations').insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      accuracy_score: accuracy,
      helpfulness_score: helpfulness,
      tone_score: tone,
      completeness_score: completeness,
      policy_score: policy,
      evaluator_model: 'gpt-4o',
      evaluation_notes: (scores.notes || '').slice(0, 500),
      flagged_for_review: false,
    });

    if (insertErr) {
      console.error(`[evaluate-conversations] Insert error for ${conversationId}:`, insertErr);
      return null;
    }

    // Route low-scoring conversations to review queue
    if (composite < 0.5) {
      await supabase.from('review_queue').upsert({
        organization_id: organizationId,
        conversation_id: conversationId,
        reason: 'low_eval_score',
        priority: 2,
        details: `Composite score ${composite.toFixed(3)} — accuracy:${accuracy} helpfulness:${helpfulness} tone:${tone} completeness:${completeness} policy:${policy}`,
        status: 'pending',
      }, { onConflict: 'conversation_id,reason', ignoreDuplicates: true }).then(
        ({ error: qErr }: any) => { if (qErr) console.warn('[evaluate-conversations] Review queue insert error:', qErr); }
      );
    }

    return { composite };
  } catch (err) {
    console.warn(`[evaluate-conversations] GPT evaluation failed for ${conversationId}:`, err);
    return null;
  }
}

// ── Sampling: prioritize flagged + negative feedback + random 50% ──

async function applySampling(supabase: any, candidates: any[]): Promise<any[]> {
  const ids = candidates.map((c: any) => c.id);

  // Get conversations with quality flags
  const { data: flagged } = await supabase
    .from('widget_ai_messages')
    .select('conversation_id')
    .in('conversation_id', ids)
    .eq('quality_check_passed', false);

  const flaggedIds = new Set((flagged || []).map((f: any) => f.conversation_id));

  // Get conversations with negative feedback
  const { data: negFeedback } = await supabase
    .from('widget_ai_feedback')
    .select('conversation_id')
    .in('conversation_id', ids)
    .eq('rating', 'negative');

  const negIds = new Set((negFeedback || []).map((f: any) => f.conversation_id));

  // Split into priority (must evaluate) and rest (sample 50%)
  const priority: any[] = [];
  const rest: any[] = [];

  for (const c of candidates) {
    if (flaggedIds.has(c.id) || negIds.has(c.id)) {
      priority.push(c);
    } else {
      rest.push(c);
    }
  }

  // Random 50% of the rest
  const shuffled = rest.sort(() => Math.random() - 0.5);
  const sampled = shuffled.slice(0, Math.ceil(rest.length * 0.5));

  return [...priority, ...sampled];
}

// ── Helpers ──

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}

function errorResponse(msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 500,
    headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  });
}
