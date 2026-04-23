import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

export function useFailureCount() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);

  return useQuery({
    queryKey: ['recruitment-automation-failure-count', orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('recruitment_automation_executions')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .eq('overall_status', 'failed')
        .eq('is_dry_run', false)
        .is('acknowledged_at', null);

      if (error) throw error;
      return { count: count ?? 0 };
    },
    enabled: !!orgId,
  });
}