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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('[evaluate-autonomy] Starting weekly autonomy evaluation...');

    // Get all organizations that have AI conversations
    const { data: orgs } = await supabase
      .from('widget_ai_conversations')
      .select('organization_id')
      .limit(1000);

    const uniqueOrgs = [...new Set((orgs || []).map((o: any) => o.organization_id))];
    console.log(`[evaluate-autonomy] Processing ${uniqueOrgs.length} organizations`);

    let totalUpdated = 0;

    for (const orgId of uniqueOrgs) {
      try {
        const updated = await evaluateOrganization(supabase, orgId);
        totalUpdated += updated;
      } catch (e) {
        console.warn(`[evaluate-autonomy] Error for org ${orgId}:`, e);
      }
    }

    console.log(`[evaluate-autonomy] Done: ${totalUpdated} autonomy levels updated`);
    return new Response(
      JSON.stringify({ success: true, organizations: uniqueOrgs.length, levels_updated: totalUpdated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[evaluate-autonomy] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function evaluateOrganization(supabase: any, orgId: string): Promise<number> {
  // Gather confidence data grouped by intent_category
  const { data: messages } = await supabase
    .from('widget_ai_messages')
    .select('confidence_score, confidence_breakdown')
    .not('confidence_breakdown', 'is', null)
    .eq('role', 'assistant')
    .limit(5000);

  // Filter to this org's messages via conversation join would be expensive,
  // so we aggregate from the breakdown's intent_category
  // Instead, query widget_ai_conversations for this org's conversation IDs
  const { data: convs } = await supabase
    .from('widget_ai_conversations')
    .select('id')
    .eq('organization_id', orgId);

  if (!convs || convs.length === 0) return 0;
  const convIds = new Set(convs.map((c: any) => c.id));

  // Get all assistant messages with confidence for this org's conversations
  const { data: orgMessages } = await supabase
    .from('widget_ai_messages')
    .select('confidence_score, confidence_breakdown, conversation_id')
    .in('conversation_id', convs.map((c: any) => c.id))
    .not('confidence_breakdown', 'is', null)
    .eq('role', 'assistant')
    .limit(5000);

  if (!orgMessages || orgMessages.length === 0) return 0;

  // Group by intent_category
  const byIntent: Record<string, { scores: number[], confidences: number[] }> = {};
  for (const msg of orgMessages) {
    const cat = msg.confidence_breakdown?.intent_category || 'general_faq';
    if (!byIntent[cat]) byIntent[cat] = { scores: [], confidences: [] };
    if (msg.confidence_score != null) {
      byIntent[cat].confidences.push(msg.confidence_score);
    }
  }

  // Get evaluation scores per conversation
  const { data: evals } = await supabase
    .from('conversation_evaluations')
    .select('conversation_id, composite_score')
    .eq('organization_id', orgId);

  const evalByConv: Record<string, number> = {};
  for (const e of evals || []) {
    evalByConv[e.conversation_id] = e.composite_score;
  }

  // Get feedback data
  const { data: feedback } = await supabase
    .from('widget_ai_feedback')
    .select('conversation_id, rating, created_at')
    .eq('organization_id', orgId);

  const negFeedbackByConv: Record<string, string> = {}; // conv_id → latest negative date
  const feedbackByConv: Record<string, { pos: number, neg: number }> = {};
  for (const f of feedback || []) {
    if (!feedbackByConv[f.conversation_id]) feedbackByConv[f.conversation_id] = { pos: 0, neg: 0 };
    if (f.rating === 'positive') feedbackByConv[f.conversation_id].pos++;
    if (f.rating === 'negative') {
      feedbackByConv[f.conversation_id].neg++;
      if (!negFeedbackByConv[f.conversation_id] || f.created_at > negFeedbackByConv[f.conversation_id]) {
        negFeedbackByConv[f.conversation_id] = f.created_at;
      }
    }
  }

  // Get quality flags (recent)
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentFlags } = await supabase
    .from('widget_ai_messages')
    .select('conversation_id')
    .in('conversation_id', convs.map((c: any) => c.id))
    .eq('quality_check_passed', false)
    .gte('created_at', fourteenDaysAgo);

  const hasRecentFlags = new Set((recentFlags || []).map((f: any) => f.conversation_id));

  // Now evaluate each intent category
  let updated = 0;

  for (const [intent, data] of Object.entries(byIntent)) {
    const totalResponses = data.confidences.length;
    const avgConfidence = totalResponses > 0
      ? data.confidences.reduce((a, b) => a + b, 0) / totalResponses
      : 0;

    // Compute acceptance rate from feedback
    let totalFeedback = 0;
    let positiveFeedback = 0;
    for (const convId of Object.keys(feedbackByConv)) {
      if (!convIds.has(convId)) continue;
      totalFeedback += feedbackByConv[convId].pos + feedbackByConv[convId].neg;
      positiveFeedback += feedbackByConv[convId].pos;
    }
    const acceptanceRate = totalFeedback > 0 ? positiveFeedback / totalFeedback : 0.5;

    // Average evaluation score
    let evalTotal = 0;
    let evalCount = 0;
    for (const convId of Object.keys(evalByConv)) {
      if (convIds.has(convId)) {
        evalTotal += evalByConv[convId];
        evalCount++;
      }
    }
    const avgEvalScore = evalCount > 0 ? evalTotal / evalCount : 0.5;

    // Latest negative feedback
    let latestNeg: string | null = null;
    for (const convId of Object.keys(negFeedbackByConv)) {
      if (convIds.has(convId)) {
        if (!latestNeg || negFeedbackByConv[convId] > latestNeg) {
          latestNeg = negFeedbackByConv[convId];
        }
      }
    }

    // Any quality flags in last 14 days?
    const hasFlags14d = [...hasRecentFlags].some(id => convIds.has(id));

    // Get current level
    const { data: current } = await supabase
      .from('topic_autonomy_levels')
      .select('current_level, override_max_level')
      .eq('organization_id', orgId)
      .eq('intent_category', intent)
      .single();

    let currentLevel = current?.current_level ?? 0;
    const overrideMax = current?.override_max_level;

    // Apply graduation thresholds
    const newLevel = computeLevel(
      currentLevel, totalResponses, acceptanceRate, avgEvalScore,
      hasFlags14d, latestNeg, overrideMax,
    );

    // Upsert
    const { error: upsertErr } = await supabase
      .from('topic_autonomy_levels')
      .upsert({
        organization_id: orgId,
        intent_category: intent,
        current_level: newLevel,
        total_responses: totalResponses,
        acceptance_rate: Math.round(acceptanceRate * 1000) / 1000,
        avg_confidence: Math.round(avgConfidence * 1000) / 1000,
        avg_eval_score: Math.round(avgEvalScore * 1000) / 1000,
        last_negative_feedback_at: latestNeg,
        last_evaluated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,intent_category' });

    if (upsertErr) {
      console.warn(`[evaluate-autonomy] Upsert error for ${orgId}/${intent}:`, upsertErr);
    } else {
      if (newLevel !== currentLevel) {
        console.log(`[evaluate-autonomy] ${intent}: level ${currentLevel} → ${newLevel} (acc=${(acceptanceRate*100).toFixed(0)}% eval=${(avgEvalScore*100).toFixed(0)}% n=${totalResponses})`);
      }
      updated++;
    }
  }

  return updated;
}

function computeLevel(
  currentLevel: number,
  totalResponses: number,
  acceptanceRate: number,
  avgEvalScore: number,
  hasQualityFlags14d: boolean,
  latestNegativeFeedback: string | null,
  overrideMax: number | null,
): number {
  // Immediate demotion: quality flags → Level 0
  if (hasQualityFlags14d && currentLevel > 0) {
    console.log(`[evaluate-autonomy] Demoting to 0: quality flags in last 14 days`);
    return 0;
  }

  // Check demotion: acceptance below threshold
  const demotionThresholds: Record<number, number> = { 1: 0.60, 2: 0.75, 3: 0.85 };
  if (currentLevel > 0 && acceptanceRate < (demotionThresholds[currentLevel] || 0)) {
    const newLevel = currentLevel - 1;
    console.log(`[evaluate-autonomy] Demoting ${currentLevel} → ${newLevel}: acceptance ${(acceptanceRate*100).toFixed(0)}%`);
    return newLevel;
  }

  // Check graduation
  let targetLevel = currentLevel;

  // 0 → 1: acceptance > 0.70, total >= 20, avg_eval > 0.6
  if (currentLevel === 0 && acceptanceRate > 0.70 && totalResponses >= 20 && avgEvalScore > 0.6) {
    targetLevel = 1;
  }

  // 1 → 2: acceptance > 0.85, total >= 75, avg_eval > 0.7, no flags 14d
  if (currentLevel === 1 && acceptanceRate > 0.85 && totalResponses >= 75 && avgEvalScore > 0.7 && !hasQualityFlags14d) {
    targetLevel = 2;
  }

  // 2 → 3: acceptance > 0.95, total >= 300, avg_eval > 0.8, no neg 30d, override allows
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const noRecentNeg = !latestNegativeFeedback || latestNegativeFeedback < thirtyDaysAgo;
  if (currentLevel === 2 && acceptanceRate > 0.95 && totalResponses >= 300 && avgEvalScore > 0.8
      && noRecentNeg && (overrideMax === null || overrideMax >= 3)) {
    targetLevel = 3;
  }

  // Respect admin hard cap
  if (overrideMax !== null && targetLevel > overrideMax) {
    targetLevel = overrideMax;
  }

  return targetLevel;
}
