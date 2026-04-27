import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedAuditEvent, AuditEventFilters, EventSource } from '../types';

interface UseAuditEventsParams extends AuditEventFilters {
  organizationId: string | null;
  applicantId?: string | null;
  limit?: number;
}

export function useAuditEvents(params: UseAuditEventsParams) {
  const { organizationId, applicantId, from, to, eventTypes, sources, actorProfileId, limit = 500 } = params;

  return useQuery({
    queryKey: ['recruitment-audit-events', organizationId, applicantId, from, to, eventTypes, sources, actorProfileId, limit],
    enabled: !!organizationId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<UnifiedAuditEvent[]> => {
      if (!organizationId) return [];

      const wantSource = (s: EventSource) => !sources || sources.length === 0 || sources.includes(s);

      // Audit events
      const auditPromise = (async () => {
        if (!wantSource('audit')) return [];
        let q = (supabase as any)
          .from('recruitment_audit_events')
          .select('*')
          .eq('organization_id', organizationId)
          .order('occurred_at', { ascending: false })
          .limit(limit);
        if (applicantId) q = q.eq('applicant_id', applicantId);
        if (from) q = q.gte('occurred_at', from);
        if (to) q = q.lte('occurred_at', to);
        if (eventTypes?.length) q = q.in('event_type', eventTypes);
        if (actorProfileId) q = q.eq('actor_profile_id', actorProfileId);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map((r: any): UnifiedAuditEvent => ({
          id: r.id,
          occurred_at: r.occurred_at,
          source: 'audit',
          event_type: r.event_type,
          event_category: r.event_category,
          subject_table: r.subject_table,
          subject_id: r.subject_id,
          applicant_id: r.applicant_id,
          actor_profile_id: r.actor_profile_id,
          description: `${r.event_category}: ${r.subject_table}`,
          old_values: r.old_values,
          new_values: r.new_values,
          context: r.context,
          raw: r,
        }));
      })();

      // Automation executions
      const autoPromise = (async () => {
        if (!wantSource('automation')) return [];
        let q = (supabase as any)
          .from('recruitment_automation_executions')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (applicantId) q = q.eq('applicant_id', applicantId);
        if (from) q = q.gte('created_at', from);
        if (to) q = q.lte('created_at', to);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map((r: any): UnifiedAuditEvent => ({
          id: r.id,
          occurred_at: r.created_at,
          source: 'automation',
          event_type: 'automation_executed',
          subject_table: 'recruitment_automation_executions',
          subject_id: r.id,
          applicant_id: r.applicant_id,
          actor_profile_id: r.triggered_by,
          description: `${r.rule_name ?? 'Regel'} — ${r.overall_status}`,
          context: { rule_id: r.rule_id, duration_ms: r.duration_ms, results: r.action_results, trigger: r.trigger_context },
          raw: r,
        }));
      })();

      // Ingestion log
      const ingPromise = (async () => {
        if (!wantSource('ingestion')) return [];
        let q = (supabase as any)
          .from('recruitment_lead_ingestion_log')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit);
        if (applicantId) q = q.eq('applicant_id', applicantId);
        if (from) q = q.gte('created_at', from);
        if (to) q = q.lte('created_at', to);
        const { data, error } = await q;
        if (error) throw error;
        return (data ?? []).map((r: any): UnifiedAuditEvent => ({
          id: r.id,
          occurred_at: r.created_at,
          source: 'ingestion',
          event_type: `ingestion_${r.status}`,
          subject_table: 'recruitment_lead_ingestion_log',
          subject_id: r.id,
          applicant_id: r.applicant_id,
          description: `${r.source}${r.error_message ? ': ' + r.error_message : ''}`,
          context: { external_id: r.external_id, integration_id: r.integration_id, payload: r.raw_payload },
          raw: r,
        }));
      })();

      const [a, b, c] = await Promise.all([auditPromise, autoPromise, ingPromise]);
      const merged = [...a, ...b, ...c];
      merged.sort((x, y) => y.occurred_at.localeCompare(x.occurred_at));
      return merged;
    },
  });
}
