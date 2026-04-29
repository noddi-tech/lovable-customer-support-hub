import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MetaHealthCheckResult } from '@/components/dashboard/recruitment/admin/integrations/types';

export function useMetaIntegrationHealth(integrationId: string | null | undefined) {
  return useQuery({
    queryKey: ['meta-integration-health', integrationId],
    enabled: !!integrationId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchInterval: 5 * 60 * 1000,
    queryFn: async (): Promise<{
      result: MetaHealthCheckResult | null;
      checked_at: string | null;
    }> => {
      if (!integrationId) return { result: null, checked_at: null };
      const { data, error } = await supabase
        .from('recruitment_meta_integrations' as any)
        .select('last_health_check_result, last_health_check_at')
        .eq('id', integrationId)
        .maybeSingle();
      if (error) throw error;
      const row = data as any;
      return {
        result: (row?.last_health_check_result as MetaHealthCheckResult | null) ?? null,
        checked_at: row?.last_health_check_at ?? null,
      };
    },
  });
}
