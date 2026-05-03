import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import type {
  FieldMappingTemplate,
  FieldMappingTemplateItem,
} from '@/components/dashboard/recruitment/admin/integrations/types';

const LIST_KEY = (orgId: string | null, scope: 'all' | 'system' | 'org') =>
  ['recruitment-templates', orgId, scope];
const ITEMS_KEY = (templateId: string | null) => ['recruitment-template-items', templateId];

export function useFieldMappingTemplates(scope: 'all' | 'system' | 'org' = 'all') {
  const { currentOrganizationId } = useOrganizationStore();
  return useQuery({
    queryKey: LIST_KEY(currentOrganizationId, scope),
    enabled: !!currentOrganizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<FieldMappingTemplate[]> => {
      let q = supabase
        .from('recruitment_field_mapping_templates')
        .select('*')
        .order('name', { ascending: true });
      if (scope === 'system') q = q.is('organization_id', null);
      if (scope === 'org') q = q.eq('organization_id', currentOrganizationId!);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as FieldMappingTemplate[];
    },
  });
}

export function useFieldMappingTemplate(id: string | null) {
  return useQuery({
    queryKey: ['recruitment-template', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_field_mapping_templates')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FieldMappingTemplate | null;
    },
  });
}

export function useFieldMappingTemplateItems(templateId: string | null) {
  return useQuery({
    queryKey: ITEMS_KEY(templateId),
    enabled: !!templateId,
    queryFn: async (): Promise<FieldMappingTemplateItem[]> => {
      const { data, error } = await supabase
        .from('recruitment_field_mapping_template_items')
        .select('*')
        .eq('template_id', templateId!)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as FieldMappingTemplateItem[];
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string | null;
      target_role_hint?: string | null;
      scope: 'system' | 'org';
    }) => {
      const orgId = input.scope === 'system' ? null : currentOrganizationId;
      if (input.scope === 'org' && !orgId) throw new Error('Ingen organisasjon valgt');
      const { data, error } = await supabase
        .from('recruitment_field_mapping_templates')
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description ?? null,
          target_role_hint: input.target_role_hint ?? null,
          created_by: profile?.id ?? null,
        } as any)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as FieldMappingTemplate;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-templates'] });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { id: string } & Partial<Pick<FieldMappingTemplate, 'name' | 'description' | 'target_role_hint'>>
    ) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('recruitment_field_mapping_templates')
        .update(patch as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['recruitment-templates'] });
      qc.invalidateQueries({ queryKey: ['recruitment-template', vars.id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_field_mapping_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment-templates'] }),
  });
}

export function useCreateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FieldMappingTemplateItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('recruitment_field_mapping_template_items')
        .insert(input as any)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ITEMS_KEY((vars as any).template_id) }),
  });
}

export function useUpdateTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; template_id: string } & Partial<FieldMappingTemplateItem>) => {
      const { id, template_id: _t, ...patch } = input;
      const { data, error } = await supabase
        .from('recruitment_field_mapping_template_items')
        .update(patch as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ITEMS_KEY(vars.template_id) }),
  });
}

export function useDeleteTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; template_id: string }) => {
      const { error } = await supabase
        .from('recruitment_field_mapping_template_items')
        .delete()
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ITEMS_KEY(vars.template_id) }),
  });
}

/**
 * Fork a system (or any) template into a new org-scoped copy with all items.
 */
export function useForkTemplate() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { sourceTemplateId: string; newName?: string }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      const { data: src, error: e1 } = await supabase
        .from('recruitment_field_mapping_templates')
        .select('*')
        .eq('id', input.sourceTemplateId)
        .maybeSingle();
      if (e1 || !src) throw e1 ?? new Error('Mal ikke funnet');

      const { data: items, error: e2 } = await supabase
        .from('recruitment_field_mapping_template_items')
        .select('*')
        .eq('template_id', input.sourceTemplateId)
        .order('display_order', { ascending: true });
      if (e2) throw e2;

      const { data: newTpl, error: e3 } = await supabase
        .from('recruitment_field_mapping_templates')
        .insert({
          organization_id: currentOrganizationId,
          name: input.newName ?? `${(src as any).name} (kopi)`,
          description: (src as any).description,
          target_role_hint: (src as any).target_role_hint,
          created_by: profile?.id ?? null,
        } as any)
        .select('*')
        .single();
      if (e3 || !newTpl) throw e3 ?? new Error('Kunne ikke opprette kopi');

      if (items && items.length > 0) {
        const itemsCopy = items.map((it: any) => ({
          template_id: (newTpl as any).id,
          meta_question_pattern: it.meta_question_pattern,
          target_kind: it.target_kind,
          target_standard_field: it.target_standard_field,
          target_custom_field_key: it.target_custom_field_key,
          target_custom_field_type_key: it.target_custom_field_type_key,
          display_order: it.display_order,
        }));
        const { error: e4 } = await supabase
          .from('recruitment_field_mapping_template_items')
          .insert(itemsCopy as any);
        if (e4) throw e4;
      }

      return newTpl as unknown as FieldMappingTemplate;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment-templates'] }),
  });
}
