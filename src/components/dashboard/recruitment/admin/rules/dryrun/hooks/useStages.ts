import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { StageOption } from '../types';

export function useStages() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  const db = supabase as any;

  return useQuery({
    queryKey: ['recruitment-automation-dry-run-stages', orgId],
    queryFn: async (): Promise<StageOption[]> => {
      const { data, error } = await db
        .from('recruitment_pipeline_stages')
        .select('id, name, color, order_index')
        .eq('organization_id', orgId!)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as StageOption[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}
