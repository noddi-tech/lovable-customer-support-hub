import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

/**
 * Returns a map of trigger_type → count of active automation rules in the
 * current organization. Used by the dry-run trigger picker to surface
 * coverage gaps to admins.
 */
export function useRuleCountByTrigger() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);

  return useQuery({
    queryKey: ['recruitment-automation-rule-counts-by-trigger', orgId],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from('recruitment_automation_rules')
        .select('trigger_type')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data ?? []).forEach((row: { trigger_type: string }) => {
        counts[row.trigger_type] = (counts[row.trigger_type] ?? 0) + 1;
      });
      return counts;
    },
    enabled: !!orgId,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}
