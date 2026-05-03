import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import type { CustomField } from '@/components/dashboard/recruitment/admin/integrations/types';

export interface CustomFieldWithType extends CustomField {
  type_key: string;
  type_display_name: string;
  type_supports_options: boolean;
  type_ui_component: string;
}

const KEY = (orgId: string | null) => ['recruitment-custom-fields', orgId];

export function useCustomFields() {
  const { currentOrganizationId } = useOrganizationStore();
  return useQuery({
    queryKey: KEY(currentOrganizationId),
    enabled: !!currentOrganizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<CustomFieldWithType[]> => {
      const { data, error } = await supabase
        .from('recruitment_custom_fields')
        .select('*, recruitment_custom_field_types!inner(type_key, display_name_no, supports_options, ui_component)')
        .eq('organization_id', currentOrganizationId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        type_key: r.recruitment_custom_field_types?.type_key,
        type_display_name: r.recruitment_custom_field_types?.display_name_no,
        type_supports_options: r.recruitment_custom_field_types?.supports_options,
        type_ui_component: r.recruitment_custom_field_types?.ui_component,
      })) as CustomFieldWithType[];
    },
  });
}

export interface CreateCustomFieldInput {
  field_key: string;
  display_name: string;
  description?: string | null;
  type_id: string;
  options?: Array<{ value: string; label_no?: string }> | null;
  validation_overrides?: Record<string, unknown> | null;
  is_required?: boolean;
  show_on_card?: boolean;
  show_on_profile?: boolean;
  display_order?: number;
}

export function useCreateCustomField() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateCustomFieldInput) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      const { data, error } = await supabase
        .from('recruitment_custom_fields')
        .insert({
          organization_id: currentOrganizationId,
          created_by: profile?.id ?? null,
          ...input,
        } as any)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(currentOrganizationId) }),
  });
}

export function useUpdateCustomField() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<CreateCustomFieldInput>) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('recruitment_custom_fields')
        .update(patch as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(currentOrganizationId) }),
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_custom_fields')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(currentOrganizationId) }),
  });
}
