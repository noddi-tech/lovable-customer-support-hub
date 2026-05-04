import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { RecruitmentAdminAlert } from '@/components/dashboard/recruitment/admin/integrations/types';

export function useAdminAlerts() {
  const { currentOrganizationId } = useOrganizationStore();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['recruitment-admin-alerts', currentOrganizationId],
    enabled: !!currentOrganizationId,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<RecruitmentAdminAlert[]> => {
      if (!currentOrganizationId) return [];
      const { data, error } = await supabase
        .from('recruitment_admin_alerts' as any)
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .is('resolved_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as RecruitmentAdminAlert[]) ?? [];
    },
  });

  const resolveAlert = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_admin_alerts' as any)
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['recruitment-admin-alerts', currentOrganizationId] }),
  });

  return {
    alerts: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    resolveAlert,
  };
}
