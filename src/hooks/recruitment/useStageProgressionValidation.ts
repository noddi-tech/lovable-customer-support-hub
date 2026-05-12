import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MissingField {
  field_id: string;
  field_name: string;
  field_type: string;
  requirement_type: 'required' | 'optional';
  block_stage_progression: boolean;
}

export interface StageProgressionResult {
  can_progress: boolean;
  missing_required: MissingField[];
  missing_optional: MissingField[];
  can_override: boolean;
}

export function useStageProgressionValidation() {
  return useMutation({
    mutationFn: async (input: {
      application_id: string;
      target_stage_id: string;
    }): Promise<StageProgressionResult> => {
      const { data, error } = await supabase.functions.invoke('validate-stage-progression', {
        body: input,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as StageProgressionResult;
    },
  });
}
