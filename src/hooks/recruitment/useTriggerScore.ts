import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type TriggerReason = 'initial' | 'stage_change' | 'manual' | 'data_change' | 're_run';

export function useTriggerScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { application_id: string; trigger_reason?: TriggerReason }) => {
      const { data, error } = await supabase.functions.invoke('score-application', {
        body: { application_id: input.application_id, trigger_reason: input.trigger_reason ?? 'manual' },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { queued: boolean; queue_id: string; already_pending?: boolean };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['application-score', vars.application_id] });
      qc.invalidateQueries({ queryKey: ['applicant-queue-position', vars.application_id] });
      qc.invalidateQueries({ queryKey: ['position-scoring-queue'] });
    },
  });
}
