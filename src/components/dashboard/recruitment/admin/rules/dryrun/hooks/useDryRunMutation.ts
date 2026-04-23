import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { DryRunRequest, DryRunResult } from '../types';

export function useDryRunMutation() {
  const queryClient = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);

  return useMutation({
    mutationFn: async (request: DryRunRequest): Promise<DryRunResult[]> => {
      if (!orgId) {
        throw new Error('Ingen organisasjon valgt');
      }

      const triggerContext: Record<string, unknown> = {
        organization_id: orgId,
        applicant_id: request.applicantId,
      };

      if (request.triggerType === 'stage_entered' && request.stageId) {
        triggerContext.to_stage_id = request.stageId;
      }

      const { data, error } = await supabase.rpc('execute_automation_rules', {
        p_trigger_type: request.triggerType,
        p_trigger_context: triggerContext,
        p_dry_run: true,
      });

      if (error) throw error;
      return (data ?? []) as DryRunResult[];
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['recruitment-automation-executions', orgId] });
    },
  });
}
