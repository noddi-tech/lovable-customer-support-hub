import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { FormFieldMapping } from '@/components/dashboard/recruitment/admin/integrations/types';

const KEY = (formMappingId: string | null) => ['recruitment-form-field-mappings', formMappingId];

export function useFormFieldMappings(formMappingId: string | null) {
  return useQuery({
    queryKey: KEY(formMappingId),
    enabled: !!formMappingId,
    staleTime: 30_000,
    queryFn: async (): Promise<FormFieldMapping[]> => {
      const { data, error } = await supabase
        .from('recruitment_form_field_mappings')
        .select('*')
        .eq('form_mapping_id', formMappingId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FormFieldMapping[];
    },
  });
}

export interface UpsertFieldMappingInput {
  form_mapping_id: string;
  meta_question_id: string;
  meta_question_key?: string | null;
  meta_question_text: string;
  target_kind: 'standard' | 'custom' | 'metadata_only';
  target_standard_field?: 'full_name' | 'email' | 'phone_number' | null;
  target_custom_field_id?: string | null;
  display_order?: number;
}

export function useUpsertFormFieldMappings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: UpsertFieldMappingInput[]) => {
      if (rows.length === 0) return [];
      const { data, error } = await supabase
        .from('recruitment_form_field_mappings')
        .upsert(rows as any, { onConflict: 'form_mapping_id,meta_question_id' })
        .select('*');
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      const fmId = vars[0]?.form_mapping_id;
      if (fmId) qc.invalidateQueries({ queryKey: KEY(fmId) });
    },
  });
}

export function useDeleteFormFieldMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; form_mapping_id: string }) => {
      const { error } = await supabase
        .from('recruitment_form_field_mappings')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: KEY(vars.form_mapping_id) }),
  });
}
