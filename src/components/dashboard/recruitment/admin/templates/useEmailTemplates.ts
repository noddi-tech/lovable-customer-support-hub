import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { EmailTemplate, TemplateFilter } from './types';

export function useEmailTemplates() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: ['recruitment-email-templates', orgId],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .select('*')
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EmailTemplate[];
    },
    enabled: !!orgId,
    refetchOnMount: 'always',
  });
}

export function useFilteredTemplates(
  templates: EmailTemplate[] | undefined,
  filter: TemplateFilter,
  search: string,
): EmailTemplate[] {
  return useMemo(() => {
    if (!templates) return [];
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      // filter by status
      const isDeleted = !!t.soft_deleted_at;
      if (filter === 'active' && (isDeleted || !t.is_active)) return false;
      if (filter === 'inactive' && (isDeleted || t.is_active)) return false;
      if (filter === 'deleted' && !isDeleted) return false;
      // 'all' shows everything

      // search
      if (q) {
        const inName = t.name.toLowerCase().includes(q);
        const inSubject = t.subject.toLowerCase().includes(q);
        if (!inName && !inSubject) return false;
      }
      return true;
    });
  }, [templates, filter, search]);
}
