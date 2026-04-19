import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { Stage } from './types';

export function useDefaultPipeline() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: ['recruitment-pipeline-admin', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_pipelines')
        .select('id, name, stages, is_default, created_at, updated_at')
        .eq('organization_id', orgId!)
        .eq('is_default', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
    refetchOnMount: 'always',
  });
}

export function useStageApplicationCounts(pipelineId: string | undefined) {
  return useQuery({
    queryKey: ['stage-app-counts', pipelineId],
    queryFn: async () => {
      if (!pipelineId) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from('applications')
        .select('current_stage_id, position_id, job_positions!inner(pipeline_id)')
        .eq('job_positions.pipeline_id', pipelineId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((row: any) => {
        counts[row.current_stage_id] = (counts[row.current_stage_id] ?? 0) + 1;
      });
      return counts;
    },
    enabled: !!pipelineId,
    refetchOnMount: 'always',
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['recruitment-pipeline-admin'] });
  queryClient.invalidateQueries({ queryKey: ['recruitment-pipeline-default'] });
  queryClient.invalidateQueries({ queryKey: ['stage-app-counts'] });
  queryClient.invalidateQueries({ queryKey: ['job-positions'] });
  queryClient.invalidateQueries({ queryKey: ['pipeline-applications'] });
  queryClient.invalidateQueries({ queryKey: ['applicants'] });
}

export function useUpdatePipelineStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ pipelineId, stages }: { pipelineId: string; stages: Stage[] }) => {
      const { data, error } = await supabase.rpc('update_pipeline_stages', {
        p_pipeline_id: pipelineId,
        p_new_stages: stages as any,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useReassignAndUpdateStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pipelineId,
      fromStageId,
      toStageId,
      newStages,
    }: {
      pipelineId: string;
      fromStageId: string;
      toStageId: string;
      newStages: Stage[];
    }) => {
      const { data, error } = await supabase.rpc('reassign_applications_to_stage', {
        p_pipeline_id: pipelineId,
        p_from_stage_id: fromStageId,
        p_to_stage_id: toStageId,
        p_new_stages: newStages as any,
      });
      if (error) throw error;
      return data as {
        affected_applications: number;
        from_stage: string;
        to_stage: string;
        new_stages_count: number;
      };
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
