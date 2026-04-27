import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAuditAnalytics(organizationId: string | null, dateRange?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['recruitment-audit-analytics', organizationId, dateRange?.from, dateRange?.to],
    enabled: !!organizationId,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!organizationId) return null;

      let appsQ = (supabase as any)
        .from('applications')
        .select('id, current_stage_id, applied_at, applicant_id, created_at, updated_at')
        .eq('organization_id', organizationId);
      if (dateRange?.from) appsQ = appsQ.gte('created_at', dateRange.from);
      if (dateRange?.to) appsQ = appsQ.lte('created_at', dateRange.to);

      let applicantsQ = (supabase as any)
        .from('applicants')
        .select('id, source, created_at')
        .eq('organization_id', organizationId);
      if (dateRange?.from) applicantsQ = applicantsQ.gte('created_at', dateRange.from);
      if (dateRange?.to) applicantsQ = applicantsQ.lte('created_at', dateRange.to);

      let stageEventsQ = (supabase as any)
        .from('application_events')
        .select('application_id, event_type, event_data, created_at')
        .eq('organization_id', organizationId)
        .eq('event_type', 'stage_changed')
        .order('created_at', { ascending: true });
      if (dateRange?.from) stageEventsQ = stageEventsQ.gte('created_at', dateRange.from);
      if (dateRange?.to) stageEventsQ = stageEventsQ.lte('created_at', dateRange.to);

      const [apps, applicants, stageEvents] = await Promise.all([appsQ, applicantsQ, stageEventsQ]);
      if (apps.error) throw apps.error;
      if (applicants.error) throw applicants.error;
      if (stageEvents.error) throw stageEvents.error;

      // Funnel: count by current_stage_id
      const funnelMap = new Map<string, number>();
      for (const a of apps.data ?? []) {
        const stage = a.current_stage_id ?? 'unknown';
        funnelMap.set(stage, (funnelMap.get(stage) ?? 0) + 1);
      }
      const funnel = Array.from(funnelMap.entries()).map(([stage, count]) => ({ stage, count }));

      // Source ROI: applicants by source vs hired (current_stage_id = 'hired')
      const sourceMap = new Map<string, { total: number; hired: number }>();
      const applicantSource = new Map<string, string>();
      for (const a of applicants.data ?? []) {
        const src = a.source ?? 'unknown';
        applicantSource.set(a.id, src);
        const cur = sourceMap.get(src) ?? { total: 0, hired: 0 };
        cur.total += 1;
        sourceMap.set(src, cur);
      }
      for (const ap of apps.data ?? []) {
        if (ap.current_stage_id === 'hired') {
          const src = applicantSource.get(ap.applicant_id) ?? 'unknown';
          const cur = sourceMap.get(src) ?? { total: 0, hired: 0 };
          cur.hired += 1;
          sourceMap.set(src, cur);
        }
      }
      const sourceRoi = Array.from(sourceMap.entries()).map(([source, v]) => ({
        source,
        total: v.total,
        hired: v.hired,
        rate: v.total ? Math.round((v.hired / v.total) * 100) : 0,
      }));

      // Time-in-stage: from stage_changed events, compute avg dwell per from-stage
      const byApp = new Map<string, Array<{ stage: string; at: number }>>();
      for (const e of stageEvents.data ?? []) {
        const arr = byApp.get(e.application_id) ?? [];
        const stage = (e.event_data as any)?.to_stage ?? (e.event_data as any)?.new_stage ?? 'unknown';
        arr.push({ stage, at: new Date(e.created_at).getTime() });
        byApp.set(e.application_id, arr);
      }
      const dwellMap = new Map<string, { totalMs: number; n: number }>();
      for (const arr of byApp.values()) {
        for (let i = 0; i < arr.length - 1; i++) {
          const dwell = arr[i + 1].at - arr[i].at;
          const cur = dwellMap.get(arr[i].stage) ?? { totalMs: 0, n: 0 };
          cur.totalMs += dwell;
          cur.n += 1;
          dwellMap.set(arr[i].stage, cur);
        }
      }
      const timeInStage = Array.from(dwellMap.entries()).map(([stage, v]) => ({
        stage,
        avgDays: Math.round((v.totalMs / v.n / (1000 * 60 * 60 * 24)) * 10) / 10,
      }));

      return { funnel, sourceRoi, timeInStage, totalApplicants: applicants.data?.length ?? 0, totalApplications: apps.data?.length ?? 0 };
    },
  });
}
