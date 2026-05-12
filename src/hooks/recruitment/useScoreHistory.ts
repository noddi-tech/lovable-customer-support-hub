import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScoreHistoryEntry {
  id: string;
  application_id: string;
  score: number | null;
  explanation: string | null;
  strengths: string[] | null;
  concerns: string[] | null;
  per_criterion: Record<string, number> | null;
  stage_id: string | null;
  model: string | null;
  trigger_reason: string | null;
  triggered_by: string | null;
  token_usage: { input?: number; output?: number; cost_usd?: number } | null;
  created_at: string;
}

export function useScoreHistory(applicationId: string | null | undefined) {
  return useQuery({
    queryKey: ['applicant-score-history', applicationId],
    enabled: !!applicationId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<ScoreHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('applicant_score_history' as any)
        .select('*')
        .eq('application_id', applicationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}
