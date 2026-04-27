import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { FormMapping } from '../types';

const KEY = (integrationId: string | null) => ['recruitment-meta-form-mappings', integrationId];

export function useFormPositionMappings(integrationId: string | null) {
  const { currentOrganizationId } = useOrganizationStore();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(integrationId),
    enabled: !!integrationId,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<FormMapping[]> => {
      if (!integrationId) return [];
      const { data, error } = await supabase
        .from('recruitment_meta_form_mappings' as any)
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FormMapping[];
    },
  });

  const createMapping = useMutation({
    mutationFn: async (input: {
      form_id: string;
      form_name: string | null;
      position_id: string | null;
      is_active?: boolean;
    }) => {
      if (!integrationId) throw new Error('Ingen integrasjon');
      if (!currentOrganizationId) throw new Error('Ingen organisasjon');
      const { data, error } = await supabase
        .from('recruitment_meta_form_mappings' as any)
        .insert({
          integration_id: integrationId,
          organization_id: currentOrganizationId,
          form_id: input.form_id,
          form_name: input.form_name,
          position_id: input.position_id,
          is_active: input.is_active ?? true,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as FormMapping;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(integrationId) }),
  });

  const updateMapping = useMutation({
    mutationFn: async (input: { id: string } & Partial<Omit<FormMapping, 'id' | 'integration_id' | 'organization_id' | 'created_at' | 'updated_at'>>) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('recruitment_meta_form_mappings' as any)
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as FormMapping;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(integrationId) }),
  });

  const deleteMapping = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_meta_form_mappings' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(integrationId) }),
  });

  return {
    mappings: query.data ?? [],
    isLoading: query.isLoading,
    createMapping,
    updateMapping,
    deleteMapping,
  };
}
