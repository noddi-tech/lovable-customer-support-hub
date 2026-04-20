/**
 * triage-pattern-mining
 *
 * Weekly scan that turns historical conversations + Slack feedback into
 * concrete tuning proposals (add/remove keyword, raise threshold).
 *
 * Pulls last 60 days of feedback, identifies:
 *  - Keywords with ≥3 alerts and ≥60% 👎 rate → propose remove_keyword
 *  - AI categories with ≥3 alerts and ≥50% 👎 rate at current threshold → propose raise_threshold
 *
 * Writes proposals to `triage_pattern_proposals` for human review in the
 * Triage Health dashboard. Auto-expires older pending proposals.
 *
 * Triggered by pg_cron weekly + manual invocation from the dashboard.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  mute: number;
  evidence: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const summary = { orgs_scanned: 0, proposals_created: 0, expired: 0 };

    // Expire pending proposals older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: expiredCount } = await supabase
      .from('triage_pattern_proposals')
      .update({ status: 'expired' })
      .eq('status', 'pending')
      .lt('created_at', thirtyDaysAgo)
      .select('*', { count: 'exact', head: true });
    summary.expired = expiredCount ?? 0;

    // Get all orgs with active integrations
    const { data: integrations } = await supabase
      .from('slack_integrations')
      .select('organization_id, critical_keyword_overrides, critical_ai_severity_thresholds')
      .eq('is_active', true);

    if (!integrations) {
      return new Response(JSON.stringify(summary), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    for (const integration of integrations) {
      summary.orgs_scanned++;
      const orgId = integration.organization_id;

      // Pull feedback for the org
      const { data: feedback } = await supabase
        .from('critical_alert_feedback')
        .select('matched_keyword, ai_category, reaction, conversation_id, trigger_source')
        .eq('organization_id', orgId)
        .gte('created_at', sixtyDaysAgo);

      if (!feedback || feedback.length === 0) continue;

      // Aggregate by keyword
      const byKeyword = new Map<string, FeedbackStats>();
      const byCategory = new Map<string, FeedbackStats>();

      for (const row of feedback) {
        const reaction = row.reaction as '+1' | '-1' | 'mute';

        if (row.matched_keyword) {
          const key = row.matched_keyword.toLowerCase();
          if (!byKeyword.has(key)) {
            byKeyword.set(key, { total: 0, positive: 0, negative: 0, mute: 0, evidence: [] });
          }
          const stats = byKeyword.get(key)!;
          stats.total++;
          if (reaction === '+1') stats.positive++;
          else if (reaction === '-1') stats.negative++;
          else if (reaction === 'mute') stats.mute++;
          if (row.conversation_id && stats.evidence.length < 10) stats.evidence.push(row.conversation_id);
        }

        if (row.ai_category && row.ai_category !== 'none') {
          const key = row.ai_category.toLowerCase();
          if (!byCategory.has(key)) {
            byCategory.set(key, { total: 0, positive: 0, negative: 0, mute: 0, evidence: [] });
          }
          const stats = byCategory.get(key)!;
          stats.total++;
          if (reaction === '+1') stats.positive++;
          else if (reaction === '-1') stats.negative++;
          else if (reaction === 'mute') stats.mute++;
          if (row.conversation_id && stats.evidence.length < 10) stats.evidence.push(row.conversation_id);
        }
      }

      const overrides = (integration.critical_keyword_overrides as { disabled?: string[]; added?: string[] }) || {};
      const disabled = new Set((overrides.disabled || []).map((k) => k.toLowerCase()));
      const thresholds = (integration.critical_ai_severity_thresholds as Record<string, number>) || {};

      // Pull existing pending proposals to avoid duplicates
      const { data: existingProposals } = await supabase
        .from('triage_pattern_proposals')
        .select('proposal_type, value')
        .eq('organization_id', orgId)
        .eq('status', 'pending');

      const existingKeys = new Set(
        (existingProposals || []).map((p) => `${p.proposal_type}:${p.value}`),
      );

      const newProposals: Array<Record<string, unknown>> = [];

      // Keyword proposals: ≥3 alerts and ≥60% 👎 (or mute) rate → propose remove
      for (const [keyword, stats] of byKeyword.entries()) {
        if (disabled.has(keyword)) continue;
        if (stats.total < 3) continue;
        const negRate = (stats.negative + stats.mute) / stats.total;
        if (negRate >= 0.6) {
          const propKey = `remove_keyword:${keyword}`;
          if (existingKeys.has(propKey)) continue;
          newProposals.push({
            organization_id: orgId,
            proposal_type: 'remove_keyword',
            value: keyword,
            reason: `Nøkkelordet "${keyword}" har utløst ${stats.total} varsler siste 60 dager med ${Math.round(negRate * 100)}% negative reaksjoner (👎 ${stats.negative}, 🔇 ${stats.mute}). Vurder å fjerne det.`,
            evidence_conversation_ids: stats.evidence,
            evidence_count: stats.total,
          });
        }
      }

      // Category threshold proposals
      for (const [category, stats] of byCategory.entries()) {
        if (stats.total < 3) continue;
        const negRate = (stats.negative + stats.mute) / stats.total;
        const currentThreshold = thresholds[category] ?? 3;
        if (negRate >= 0.5 && currentThreshold < 5) {
          const newThreshold = Math.min(currentThreshold + 1, 5);
          const propKey = `raise_threshold:${category}`;
          if (existingKeys.has(propKey)) continue;
          newProposals.push({
            organization_id: orgId,
            proposal_type: 'raise_threshold',
            value: category,
            category,
            threshold_value: newThreshold,
            reason: `AI-kategorien "${category}" har ${Math.round(negRate * 100)}% negative reaksjoner på terskel ${currentThreshold} (${stats.total} varsler). Hev terskel til ${newThreshold} for å redusere falske alarmer.`,
            evidence_conversation_ids: stats.evidence,
            evidence_count: stats.total,
          });
        }
      }

      if (newProposals.length > 0) {
        const { error: insertError } = await supabase
          .from('triage_pattern_proposals')
          .insert(newProposals);
        if (insertError) {
          console.error(`Failed to insert proposals for org ${orgId}:`, insertError);
        } else {
          summary.proposals_created += newProposals.length;
          console.log(`✅ Created ${newProposals.length} proposals for org ${orgId}`);
        }
      }
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('triage-pattern-mining error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
