import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useUpsertApplicantFieldValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      applicant_id: string;
      field_id: string;
      value: unknown;
      raw_value?: string | null;
    }) => {
      const payload: any = {
        applicant_id: input.applicant_id,
        field_id: input.field_id,
        value: input.value as any,
        raw_value: input.raw_value ?? null,
      };
      const { data, error } = await supabase
        .from('recruitment_applicant_field_values')
        .upsert(payload, { onConflict: 'applicant_id,field_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-field-values', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['stage-progression', vars.applicant_id] });
    },
  });
}
