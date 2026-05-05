import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

export type TimeWindow = '7d' | '30d' | '90d' | 'all';
export type AssignmentScope = 'mine' | 'unassigned' | 'all';

export interface OversiktFilters {
  position_id: string | null;
  time_window: TimeWindow;
  assignment_scope: AssignmentScope;
}

export interface OversiktMetrics {
  needs_attention: {
    stage_stalled: Array<{
      application_id: string;
      applicant_id: string;
      applicant_name: string;
      stage_id: string;
      stage_name: string;
      stage_color: string;
      sla_hours: number;
      hours_over_sla: number;
      entered_stage_at: string | null;
    }>;
    assigned_no_activity: Array<{
      application_id: string;
      applicant_id: string;
      applicant_name: string;
      stage_id: string;
      stage_name: string;
      days_since_last_event: number;
      assigned_to_name: string | null;
    }>;
    overdue_followups: Array<FollowupItem>;
    todays_followups: Array<FollowupItem>;
  };
  pipeline_summary: {
    stages: Array<{ id: string; name: string; color: string; count: number; is_terminal: boolean }>;
    total_active_applicants: number;
    total_all_applicants: number;
  };
  metrics: {
    new_applicants_count: number;
    new_applicants_by_source: Array<{ source: string; count: number }>;
    hired_count: number;
    rejected_count: number;
    average_days_to_hire: number | null;
    conversion_rate_overall: number | null;
  };
  pipeline: { id?: string; stages: Array<any> };
  org_total_applicants: number;
}

export interface FollowupItem {
  followup_id: string;
  applicant_id: string;
  application_id: string | null;
  applicant_name: string;
  scheduled_for: string;
  note: string | null;
  assigned_to_user_name: string | null;
  days_overdue: number;
}

export function useOversiktMetrics(filters: OversiktFilters) {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['oversikt-metrics', currentOrganizationId, filters],
    enabled: !!currentOrganizationId,
    staleTime: 60_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<OversiktMetrics> => {
      const { data, error } = await supabase.functions.invoke('oversikt-metrics', {
        body: {
          organization_id: currentOrganizationId,
          ...filters,
        },
      });
      if (error) throw error;
      return data as OversiktMetrics;
    },
  });
}
