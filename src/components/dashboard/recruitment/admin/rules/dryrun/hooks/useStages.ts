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
        .from('recruitment_pipelines')
        .select('stages')
        .eq('organization_id', orgId!)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      if (!data?.stages || !Array.isArray(data.stages)) return [];

      return (data.stages as any[])
        .slice()
        .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
        .map((stage) => ({
          id: String(stage.id),
          name: String(stage.name ?? ''),
          color: stage.color ?? null,
          order_index: Number(stage.order ?? 0),
        })) as StageOption[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}
