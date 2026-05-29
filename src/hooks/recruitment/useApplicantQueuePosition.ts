import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AVG_SCORING_SECONDS } from './usePositionScoringQueueStatus';

export interface ApplicantQueuePosition {
  inQueue: boolean;
  status: 'pending' | 'processing' | null;
  ahead: number;
  etaMinutes: number;
  etaLabel: string;
}

function formatEta(count: number): { etaMinutes: number; etaLabel: string } {
  if (count <= 0) return { etaMinutes: 0, etaLabel: '' };
  const minutes = Math.max(1, Math.ceil((count * AVG_SCORING_SECONDS) / 60));
  if (minutes > 5) return { etaMinutes: minutes, etaLabel: '5+ min' };
  return { etaMinutes: minutes, etaLabel: `~${minutes} min` };
}

const EMPTY: ApplicantQueuePosition = {
  inQueue: false,
  status: null,
  ahead: 0,
  etaMinutes: 0,
  etaLabel: '',
};

/** Returns this application's queue row + how many other rows are queued ahead on the same position. */
export function useApplicantQueuePosition(applicationId: string | null | undefined) {
  return useQuery({
    queryKey: ['applicant-queue-position', applicationId],
    enabled: !!applicationId,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    refetchInterval: 15000,
    queryFn: async (): Promise<ApplicantQueuePosition> => {
      // 1. Get this app's queue row (if any) + position_id.
      const { data: self, error: selfErr } = await supabase
        .from('application_scoring_queue')
        .select('id, status, created_at, applications!inner(position_id)' as any)
        .eq('application_id', applicationId!)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (selfErr) throw selfErr;
      if (!self) return EMPTY;

      const status = (self as any).status as 'pending' | 'processing';
      const positionId = (self as any).applications?.position_id as string | undefined;
      const createdAt = (self as any).created_at as string;
      if (!positionId) return { ...EMPTY, inQueue: true, status };

      // 2. Count rows ahead (older pending/processing on same position).
      const { count, error: countErr } = await supabase
        .from('application_scoring_queue')
        .select('id, applications!inner(position_id)' as any, { count: 'exact', head: true })
        .in('status', ['pending', 'processing'])
        .eq('applications.position_id' as any, positionId)
        .lt('created_at', createdAt);
      if (countErr) throw countErr;

      const ahead = count ?? 0;
      return { inQueue: true, status, ahead, ...formatEta(ahead) };
    },
  });
}
