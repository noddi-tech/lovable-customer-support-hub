import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

const ACTIVE: ReadonlyArray<ScoreStatus> = ['pending', 'scoring'];
const TERMINAL: ReadonlyArray<ScoreStatus> = ['scored', 'failed', 'skipped', 'unscored'];

/** Polls every 5s while score_status is 'pending' or 'scoring'. */
export function useApplicationScore(applicationId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
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

  // Bug A: when polling observes a transition from active -> terminal, the score
  // value has just changed on the server. Fan out invalidation so all surfaces
  // that display score (header ScoreCircle via ['applicant',id], pipeline card
  // via ['pipeline-applications'], list view via ['applicants']) refetch together.
  const prevStatusRef = useRef<ScoreStatus | null | undefined>(undefined);
  const status = query.data?.score_status as ScoreStatus | null | undefined;
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status ?? null;
    if (!status) return;
    const wasActive = prev != null && ACTIVE.includes(prev);
    const isTerminal = TERMINAL.includes(status);
    if (wasActive && isTerminal) {
      qc.invalidateQueries({ queryKey: ['applicant'] });
      qc.invalidateQueries({ queryKey: ['applicants'] });
      qc.invalidateQueries({ queryKey: ['pipeline-applications'] });
    }
  }, [status, qc]);

  return query;
}
