import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PositionRubricStatus =
  | { state: 'active'; source: 'own' }
  | { state: 'active'; source: 'baseline'; baselineName: string }
  | { state: 'active'; source: 'org_default'; baselineName: string }
  | { state: 'inactive' }
  | { state: 'force_disabled' };

/** Resolves the effective scoring status for a position using the same precedence
 *  as the SQL helper `position_has_resolvable_rubric` plus the manual force-OFF flag. */
export function usePositionRubricStatus(positionId: string | null | undefined) {
  return useQuery({
    queryKey: ['position-rubric-status', positionId],
    enabled: !!positionId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<PositionRubricStatus> => {
      const { data: pos, error } = await supabase
        .from('job_positions')
        .select('organization_id, scoring_enabled, scoring_rubric, scoring_global_baseline_id')
        .eq('id', positionId!)
        .maybeSingle();
      if (error) throw error;
      if (!pos) return { state: 'inactive' };

      // Manual force-OFF: explicit FALSE only.
      if (pos.scoring_enabled === false) return { state: 'force_disabled' };

      const rubric: any = pos.scoring_rubric;
      if (rubric && Array.isArray(rubric.criteria) && rubric.criteria.length > 0) {
        return { state: 'active', source: 'own' };
      }

      if (pos.scoring_global_baseline_id) {
        const { data: b } = await supabase
          .from('org_scoring_baselines' as any)
          .select('name')
          .eq('id', pos.scoring_global_baseline_id)
          .is('soft_deleted_at', null)
          .maybeSingle();
        if (b) return { state: 'active', source: 'baseline', baselineName: (b as any).name };
      }

      const { data: def } = await supabase
        .from('org_scoring_baselines' as any)
        .select('name')
        .eq('organization_id', pos.organization_id)
        .eq('is_default', true)
        .is('soft_deleted_at', null)
        .maybeSingle();
      if (def) return { state: 'active', source: 'org_default', baselineName: (def as any).name };

      return { state: 'inactive' };
    },
  });
}
