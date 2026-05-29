import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ScoringRubric } from './useScoringBaselines';

export interface PositionScoringConfig {
  id: string;
  scoring_enabled: boolean;
  scoring_rubric: ScoringRubric | null;
  scoring_global_baseline_id: string | null;
}

export function usePositionScoringConfig(positionId: string | null | undefined) {
  return useQuery({
    queryKey: ['position-scoring-config', positionId],
    enabled: !!positionId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<PositionScoringConfig | null> => {
      const { data, error } = await supabase
        .from('job_positions')
        .select('id, scoring_enabled, scoring_rubric, scoring_global_baseline_id')
        .eq('id', positionId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpdatePositionScoringConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      scoring_enabled?: boolean;
      scoring_rubric?: ScoringRubric | null;
      scoring_global_baseline_id?: string | null;
    }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('job_positions')
        .update(patch as any)
        .eq('id', id)
        .select('id, scoring_enabled, scoring_rubric, scoring_global_baseline_id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['position-scoring-config', vars.id] });
      qc.invalidateQueries({ queryKey: ['job-positions'] });
      qc.invalidateQueries({ queryKey: ['position-scoring-queue', vars.id] });
    },
  });
}
