import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ScoreStatus = 'unscored' | 'pending' | 'scoring' | 'scored' | 'failed' | 'skipped';

export interface ApplicationScore {
  id: string;
  score: number | null;
  score_status: ScoreStatus | null;
  score_explanation: string | null;
  score_strengths: string[] | null;
  score_concerns: string[] | null;
  score_breakdown: Record<string, number> | null;
  score_updated_at: string | null;
  score_stage_id: string | null;
  score_model: string | null;
}

/** Polls every 5s while score_status is 'pending' or 'scoring'. */
export function useApplicationScore(applicationId: string | null | undefined) {
  return useQuery({
    queryKey: ['application-score', applicationId],
    enabled: !!applicationId,
    refetchOnMount: 'always',
    refetchInterval: (q) => {
      const d = q.state.data as ApplicationScore | undefined;
      if (d?.score_status === 'pending' || d?.score_status === 'scoring') return 5000;
      return false;
    },
    queryFn: async (): Promise<ApplicationScore | null> => {
      const { data, error } = await supabase
        .from('applications')
        .select(
          'id, score, score_status, score_explanation, score_strengths, score_concerns, score_breakdown, score_updated_at, score_stage_id, score_model',
        )
        .eq('id', applicationId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}
