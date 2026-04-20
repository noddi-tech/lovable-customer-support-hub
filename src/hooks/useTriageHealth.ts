import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

export interface TriggerStats {
  trigger_label: string;
  trigger_type: 'keyword' | 'ai_category';
  trigger_value: string;
  total: number;
  positive: number;
  negative: number;
  mute: number;
  positive_rate: number;
  negative_rate: number;
  mute_rate: number;
}

export interface TriageHealthData {
  total_alerts: number;
  total_feedback: number;
  positive_rate: number;
  negative_rate: number;
  mute_rate: number;
  worst_triggers: TriggerStats[];
  best_triggers: TriggerStats[];
  active_mutes: Array<{ id: string; keyword: string; expires_at: string; muted_via: string }>;
}

const DAYS_LOOKBACK = 30;

export function useTriageHealth() {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['triage-health', currentOrganizationId],
    enabled: !!currentOrganizationId,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TriageHealthData> => {
      if (!currentOrganizationId) throw new Error('No organization');

      const since = new Date(Date.now() - DAYS_LOOKBACK * 24 * 60 * 60 * 1000).toISOString();

      // Fetch in parallel
      const [feedbackRes, alertsRes, mutesRes] = await Promise.all([
        supabase
          .from('critical_alert_feedback')
          .select('matched_keyword, ai_category, reaction')
          .eq('organization_id', currentOrganizationId)
          .gte('created_at', since),
        // Use security-definer RPC to bypass per-user RLS on notifications
        supabase.rpc('get_critical_alert_count', {
          _organization_id: currentOrganizationId,
          _since: since,
        }),
        supabase
          .from('critical_keyword_mutes')
          .select('id, keyword, expires_at, muted_via')
          .eq('organization_id', currentOrganizationId)
          .gt('expires_at', new Date().toISOString())
          .order('expires_at', { ascending: true }),
      ]);

      const feedback = feedbackRes.data || [];
      const totalAlerts = (alertsRes.data as number | null) ?? 0;
      const activeMutes = mutesRes.data || [];

      // Aggregate
      const byTrigger = new Map<string, TriggerStats>();
      let pos = 0;
      let neg = 0;
      let mute = 0;

      for (const row of feedback) {
        const reaction = row.reaction as '+1' | '-1' | 'mute';
        if (reaction === '+1') pos++;
        else if (reaction === '-1') neg++;
        else if (reaction === 'mute') mute++;

        const triggers: Array<{ type: 'keyword' | 'ai_category'; value: string }> = [];
        if (row.matched_keyword) triggers.push({ type: 'keyword', value: row.matched_keyword.toLowerCase() });
        if (row.ai_category && row.ai_category !== 'none') {
          triggers.push({ type: 'ai_category', value: row.ai_category.toLowerCase() });
        }

        for (const t of triggers) {
          const key = `${t.type}:${t.value}`;
          if (!byTrigger.has(key)) {
            byTrigger.set(key, {
              trigger_label: t.type === 'keyword' ? `"${t.value}"` : t.value.replace(/_/g, ' '),
              trigger_type: t.type,
              trigger_value: t.value,
              total: 0,
              positive: 0,
              negative: 0,
              mute: 0,
              positive_rate: 0,
              negative_rate: 0,
              mute_rate: 0,
            });
          }
          const s = byTrigger.get(key)!;
          s.total++;
          if (reaction === '+1') s.positive++;
          else if (reaction === '-1') s.negative++;
          else if (reaction === 'mute') s.mute++;
        }
      }

      // Compute rates
      const allTriggers = Array.from(byTrigger.values()).map((s) => ({
        ...s,
        positive_rate: s.total > 0 ? s.positive / s.total : 0,
        negative_rate: s.total > 0 ? s.negative / s.total : 0,
        mute_rate: s.total > 0 ? s.mute / s.total : 0,
      }));

      const worst = allTriggers
        .filter((s) => s.total >= 2 && s.negative_rate + s.mute_rate >= 0.4)
        .sort((a, b) => b.negative_rate + b.mute_rate - (a.negative_rate + a.mute_rate))
        .slice(0, 8);

      const best = allTriggers
        .filter((s) => s.total >= 2 && s.positive_rate >= 0.6)
        .sort((a, b) => b.positive_rate - a.positive_rate)
        .slice(0, 8);

      const totalFeedback = pos + neg + mute;

      return {
        total_alerts: totalAlerts,
        total_feedback: totalFeedback,
        positive_rate: totalFeedback > 0 ? pos / totalFeedback : 0,
        negative_rate: totalFeedback > 0 ? neg / totalFeedback : 0,
        mute_rate: totalFeedback > 0 ? mute / totalFeedback : 0,
        worst_triggers: worst,
        best_triggers: best,
        active_mutes: activeMutes,
      };
    },
  });
}
