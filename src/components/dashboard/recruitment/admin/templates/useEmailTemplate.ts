import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { EmailTemplate, TemplateFormValues } from './types';

export function useEmailTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: ['recruitment-email-template', id],
    queryFn: async (): Promise<EmailTemplate | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EmailTemplate | null;
    },
    enabled: !!id && id !== 'new',
    refetchOnMount: 'always',
  });
}

function invalidateList(qc: ReturnType<typeof useQueryClient>, orgId: string | null) {
  qc.invalidateQueries({ queryKey: ['recruitment-email-templates', orgId] });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async (values: TemplateFormValues): Promise<EmailTemplate> => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .insert({
          organization_id: orgId!,
          name: values.name,
          description: values.description || null,
          subject: values.subject,
          body: values.body,
          stage_trigger: values.stage_trigger,
          is_active: values.is_active,
        })
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: () => invalidateList(qc, orgId),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: TemplateFormValues;
    }): Promise<EmailTemplate> => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .update({
          name: values.name,
          description: values.description || null,
          subject: values.subject,
          body: values.body,
          stage_trigger: values.stage_trigger,
          is_active: values.is_active,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as EmailTemplate;
    },
    onSuccess: (_data, vars) => {
      invalidateList(qc, orgId);
      qc.invalidateQueries({ queryKey: ['recruitment-email-template', vars.id] });
    },
  });
}

export function useSoftDeleteTemplate() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_email_templates')
        .update({ soft_deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      invalidateList(qc, orgId);
      qc.invalidateQueries({ queryKey: ['recruitment-email-template', id] });
    },
  });
}

export function useRestoreTemplate() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_email_templates')
        .update({ soft_deleted_at: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      invalidateList(qc, orgId);
      qc.invalidateQueries({ queryKey: ['recruitment-email-template', id] });
    },
  });
}

export function useHardDeleteTemplate() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_email_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, id) => {
      invalidateList(qc, orgId);
      qc.removeQueries({ queryKey: ['recruitment-email-template', id] });
    },
  });
}
