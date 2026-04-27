import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRetentionConfig(organizationId: string | null) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['recruitment-audit-retention', organizationId],
    enabled: !!organizationId,
    refetchOnMount: 'always',
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('recruitment_audit_retention_days, recruitment_audit_last_cleanup_at')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data as { recruitment_audit_retention_days: number; recruitment_audit_last_cleanup_at: string | null };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newDays: number) => {
      if (!organizationId) throw new Error('No organization');
      const { error } = await (supabase as any)
        .from('organizations')
        .update({ recruitment_audit_retention_days: newDays })
        .eq('id', organizationId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recruitment-audit-retention', organizationId] }),
  });

  const cleanupMutation = useMutation({
    mutationFn: async (): Promise<number> => {
      const { data, error } = await (supabase as any).rpc('cleanup_expired_audit_events');
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-audit-retention', organizationId] });
      qc.invalidateQueries({ queryKey: ['recruitment-audit-events'] });
    },
  });

  return { ...query, updateRetention: updateMutation, runCleanup: cleanupMutation };
}
