import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MetaFormQuestion } from '@/components/dashboard/recruitment/admin/integrations/types';

export interface FormQuestionsResult {
  questions: MetaFormQuestion[] | null;
  scope_missing?: boolean;
  error?: string | null;
}

export function useFormQuestions(formMappingId: string | null) {
  return useQuery({
    queryKey: ['meta-form-questions', formMappingId],
    enabled: !!formMappingId,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<FormQuestionsResult> => {
      const { data, error } = await supabase.functions.invoke('meta-list-form-fields', {
        body: { form_mapping_id: formMappingId },
      });
      // Per memory: invoke doesn't throw on HTTP 500, check { error } directly.
      if (error) {
        return { questions: null, error: error.message ?? 'Kunne ikke hente skjemafelt' };
      }
      return data as FormQuestionsResult;
    },
  });
}
