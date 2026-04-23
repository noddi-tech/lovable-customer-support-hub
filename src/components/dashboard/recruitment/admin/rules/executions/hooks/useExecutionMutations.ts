import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';

export function useExecutionMutations() {
  const queryClient = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recruitment-automation-failure-count', orgId] }),
      queryClient.invalidateQueries({ queryKey: ['recruitment-automation-executions', orgId] }),
    ]);
  };

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ executionId }: { executionId: string; showToast?: boolean }) => {
      const { data, error } = await supabase.rpc('acknowledge_execution', {
        p_execution_id: executionId,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (_data, variables) => {
      await invalidate();
      if (variables.showToast !== false) {
        toast.success('Feil bekreftet');
      }
    },
    onError: (error: any) => {
      const message = error?.message ?? '';
      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('acknowledged')) {
        void invalidate();
        return;
      }
      toast.error(message || 'Kunne ikke bekrefte feil');
    },
  });

  return {
    acknowledgeExecution: (input: { executionId: string; showToast?: boolean }) =>
      acknowledgeMutation.mutate(input),
    acknowledgeMutation,
  };
}