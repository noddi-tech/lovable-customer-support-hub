import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CustomFieldType } from '@/components/dashboard/recruitment/admin/integrations/types';

const KEY = ['recruitment-custom-field-types'];

export function useCustomFieldTypes() {
  return useQuery({
    queryKey: KEY,
    staleTime: 60_000,
    queryFn: async (): Promise<CustomFieldType[]> => {
      const { data, error } = await supabase
        .from('recruitment_custom_field_types')
        .select('*')
        .order('display_name_no', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CustomFieldType[];
    },
  });
}

export function useUpdateCustomFieldType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      display_name_en?: string;
      display_name_no?: string;
      validation_schema?: Record<string, unknown>;
    }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('recruitment_custom_field_types')
        .update(patch as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
