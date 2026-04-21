import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { AutomationRule } from '../types';

export function useRules() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: ['recruitment-automation-rules', orgId],
    queryFn: async (): Promise<AutomationRule[]> => {
      const { data, error } = await supabase
        .from('recruitment_automation_rules')
        .select('*')
        .eq('organization_id', orgId!)
        .order('execution_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as AutomationRule[];
    },
    enabled: !!orgId,
    refetchOnMount: 'always',
  });
}

export function useStagesForOrg() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: ['recruitment-rules-stages', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_pipelines')
        .select('id, name, stages')
        .eq('organization_id', orgId!);
      if (error) throw error;
      const seen = new Set<string>();
      const flat: Array<{ id: string; name: string; color?: string; order: number }> = [];
      (data ?? []).forEach((p: any) => {
        const stages = Array.isArray(p.stages) ? p.stages : [];
        stages.forEach((s: any, idx: number) => {
          if (!s?.id || seen.has(s.id)) return;
          seen.add(s.id);
          flat.push({
            id: s.id,
            name: s.name ?? s.id,
            color: s.color,
            order: typeof s.order === 'number' ? s.order : idx,
          });
        });
      });
      return flat.sort((a, b) => a.order - b.order);
    },
    enabled: !!orgId,
  });
}

export function usePositionsForOrg() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: ['recruitment-rules-positions', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_positions')
        .select('id, title, status')
        .eq('organization_id', orgId!)
        .order('title', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; status: string }>;
    },
    enabled: !!orgId,
  });
}

export function useActiveTemplatesForOrg() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: ['recruitment-rules-templates', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .select('id, name, subject, is_active, soft_deleted_at')
        .eq('organization_id', orgId!)
        .eq('is_active', true)
        .is('soft_deleted_at', null)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; subject: string }>;
    },
    enabled: !!orgId,
  });
}

export function useAssignableUsersForOrg() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: ['recruitment-rules-users', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select('user_id, role, status, profiles:user_id(id, full_name, email)')
        .eq('organization_id', orgId!)
        .eq('status', 'active')
        .in('role', ['admin', 'super_admin', 'agent']);
      if (error) throw error;
      const list = (data ?? [])
        .map((row: any) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          if (!profile) return null;
          return {
            id: profile.id as string,
            full_name: (profile.full_name as string | null) ?? (profile.email as string | null) ?? null,
            role: row.role as string,
          };
        })
        .filter(Boolean) as Array<{ id: string; full_name: string | null; role: string }>;
      return list.sort((a, b) =>
        (a.full_name ?? '').localeCompare(b.full_name ?? '', 'nb'),
      );
    },
    enabled: !!orgId,
  });
}
