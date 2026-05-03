import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useQuarantineApprove() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { applicant_ids: string[]; target_stage_id?: string | null }) => {
      const { data, error } = await supabase.functions.invoke(
        'recruitment-quarantine-approve',
        { body: input },
      );
      if (error) throw new Error(error.message ?? 'Godkjenning feilet');
      return data as { approved: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applicants'] }),
  });
}
