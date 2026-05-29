import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const AVG_SCORING_SECONDS = 30;

export interface PositionScoringQueueStatus {
  queueCount: number;
  pendingCount: number;
  processingCount: number;
  etaMinutes: number;
  etaLabel: string;
}

function formatEta(queueCount: number): { etaMinutes: number; etaLabel: string } {
  if (queueCount <= 0) return { etaMinutes: 0, etaLabel: '' };
  const minutes = Math.max(1, Math.ceil((queueCount * AVG_SCORING_SECONDS) / 60));
  if (minutes > 5) return { etaMinutes: minutes, etaLabel: '5+ min' };
  return { etaMinutes: minutes, etaLabel: `~${minutes} min` };
}

/** Counts pending+processing scoring queue rows for a position. Polls every 15s. */
export function usePositionScoringQueueStatus(positionId: string | null | undefined) {
  return useQuery({
    queryKey: ['position-scoring-queue', positionId],
    enabled: !!positionId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    refetchInterval: 15000,
    queryFn: async (): Promise<PositionScoringQueueStatus> => {
      const q: any = supabase
        .from('application_scoring_queue')
        .select('id, status, applications!inner(position_id)')
        .in('status', ['pending', 'processing'])
        .eq('applications.position_id', positionId!);
      const { data, error } = await q;
      if (error) throw error;
      const rows = ((data ?? []) as any[]) as Array<{ status: string }>;
      const pendingCount = rows.filter((r) => r.status === 'pending').length;
      const processingCount = rows.filter((r) => r.status === 'processing').length;
      const queueCount = rows.length;
      return { queueCount, pendingCount, processingCount, ...formatEta(queueCount) };
    },
  });
}
