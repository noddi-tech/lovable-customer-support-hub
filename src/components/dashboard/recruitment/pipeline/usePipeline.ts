import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

export interface PipelineApplication {
  id: string;
  current_stage_id: string;
  score: number | null;
  assigned_to: string | null;
  applied_at: string;
  created_at: string;
  updated_at: string;
  applicant_id: string;
  position_id: string;
  applicants: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    source: string;
  } | null;
  job_positions: { id: string; title: string } | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface PipelineFilters {
  positionId: string;
  assignedTo: string;
}

export function usePipelineApplications(filters: PipelineFilters) {
  const { currentOrganizationId } = useOrganizationStore();
  const { positionId, assignedTo } = filters;

  return useQuery({
    queryKey: ['pipeline-applications', currentOrganizationId, positionId, assignedTo],
    queryFn: async () => {
      let q = supabase
        .from('applications')
        .select(
          'id, current_stage_id, score, assigned_to, applied_at, created_at, updated_at, applicant_id, position_id, applicants(id, first_name, last_name, email, phone, source), job_positions(id, title), profiles:assigned_to(id, full_name, avatar_url)'
        )
        .order('created_at', { ascending: false });

      if (positionId !== 'all') q = q.eq('position_id', positionId);
      if (assignedTo !== 'all') q = q.eq('assigned_to', assignedTo);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PipelineApplication[];
    },
    enabled: !!currentOrganizationId,
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}
