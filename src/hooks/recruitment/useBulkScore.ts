import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TriggerReason } from './useTriggerScore';

export interface BulkScoreResult {
  total: number;
  queued: number;
  skipped: number;
  failed: number;
  errors: Array<{ application_id: string; error: string }>;
}

/** Re-scores applications by enqueuing each via score-application. Best-effort sequential to keep
 *  load predictable; callers typically operate on small selections (≤50). */
export function useBulkScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      application_ids: string[];
      trigger_reason?: TriggerReason;
    }): Promise<BulkScoreResult> => {
      const reason = input.trigger_reason ?? 're_run';
      const result: BulkScoreResult = {
        total: input.application_ids.length,
        queued: 0,
        skipped: 0,
        failed: 0,
        errors: [],
      };
      for (const id of input.application_ids) {
        try {
          const { data, error } = await supabase.functions.invoke('score-application', {
            body: { application_id: id, trigger_reason: reason },
          });
          if (error || (data as any)?.error) {
            result.failed += 1;
            result.errors.push({
              application_id: id,
              error: error?.message || (data as any)?.error || 'unknown',
            });
            continue;
          }
          if ((data as any)?.already_pending) result.skipped += 1;
          else result.queued += 1;
        } catch (e: any) {
          result.failed += 1;
          result.errors.push({ application_id: id, error: e?.message || 'unknown' });
        }
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application-score'] });
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['pipeline-applications'] });
    },
  });
}
