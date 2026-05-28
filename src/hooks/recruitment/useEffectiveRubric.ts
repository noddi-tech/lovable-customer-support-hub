import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RubricCriterion {
  id: string;
  name: string;
  weight?: number;
  description?: string;
}

export interface ScoringRubric {
  criteria: RubricCriterion[];
}

/** Resolves the effective scoring rubric for an application using the same
 *  precedence as the scoring engine: position rubric > linked baseline > null. */
export function useEffectiveRubric(applicationId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['effective-rubric', applicationId],
    enabled: !!applicationId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<ScoringRubric | null> => {
      const { data: app, error } = await supabase
        .from('applications')
        .select(
          'position_id, job_positions:position_id(scoring_rubric, scoring_global_baseline_id)',
        )
        .eq('id', applicationId!)
        .maybeSingle();
      if (error) throw error;
      const pos: any = (app as any)?.job_positions;
      if (!pos) return null;

      if (pos.scoring_rubric && Array.isArray(pos.scoring_rubric?.criteria)) {
        return pos.scoring_rubric as ScoringRubric;
      }
      if (pos.scoring_global_baseline_id) {
        const { data: baseline } = await supabase
          .from('org_scoring_baselines')
          .select('rubric')
          .eq('id', pos.scoring_global_baseline_id)
          .maybeSingle();
        const r = (baseline as any)?.rubric;
        if (r && Array.isArray(r?.criteria)) return r as ScoringRubric;
      }
      return null;
    },
  });

  const map = useMemo(() => {
    const m = new Map<string, RubricCriterion>();
    for (const c of query.data?.criteria ?? []) {
      if (c?.id) m.set(c.id, c);
    }
    return m;
  }, [query.data]);

  return { rubric: query.data ?? null, criterionMap: map, isLoading: query.isLoading };
}
