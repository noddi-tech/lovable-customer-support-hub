import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';
import { useKeywordOverrides } from './useKeywordOverrides';

export interface PatternProposal {
  id: string;
  proposal_type: 'add_keyword' | 'remove_keyword' | 'raise_threshold' | 'lower_threshold';
  value: string;
  category: string | null;
  threshold_value: number | null;
  reason: string;
  evidence_conversation_ids: string[];
  evidence_count: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

export function usePatternProposals() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { data: ovData, updateOverrides, updateThresholds } = useKeywordOverrides();

  const proposalsQuery = useQuery({
    queryKey: ['triage-proposals', currentOrganizationId],
    enabled: !!currentOrganizationId,
    queryFn: async (): Promise<PatternProposal[]> => {
      if (!currentOrganizationId) return [];
      const { data, error } = await supabase
        .from('triage_pattern_proposals')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .eq('status', 'pending')
        .order('evidence_count', { ascending: false });
      if (error) throw error;
      return (data || []) as PatternProposal[];
    },
  });

  const acceptProposal = useMutation({
    mutationFn: async (proposal: PatternProposal) => {
      if (!currentOrganizationId) throw new Error('No org');

      // Apply the proposal to overrides/thresholds
      const overrides = ovData?.overrides || { disabled: [], added: [] };
      const thresholds = ovData?.thresholds || {};

      if (proposal.proposal_type === 'remove_keyword') {
        const next = {
          disabled: Array.from(new Set([...overrides.disabled, proposal.value.toLowerCase()])),
          added: overrides.added,
        };
        await updateOverrides.mutateAsync(next);
      } else if (proposal.proposal_type === 'add_keyword') {
        const next = {
          disabled: overrides.disabled,
          added: Array.from(new Set([...overrides.added, proposal.value.toLowerCase()])),
        };
        await updateOverrides.mutateAsync(next);
      } else if (
        (proposal.proposal_type === 'raise_threshold' || proposal.proposal_type === 'lower_threshold') &&
        proposal.category &&
        proposal.threshold_value
      ) {
        await updateThresholds.mutateAsync({
          ...thresholds,
          [proposal.category]: proposal.threshold_value,
        });
      }

      // Mark proposal as accepted
      const { error } = await supabase
        .from('triage_pattern_proposals')
        .update({ status: 'accepted', reviewed_at: new Date().toISOString() })
        .eq('id', proposal.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-proposals', currentOrganizationId] });
      toast.success('Forslag godtatt og tatt i bruk');
    },
    onError: (err: Error) => toast.error(`Feil: ${err.message}`),
  });

  const rejectProposal = useMutation({
    mutationFn: async (proposalId: string) => {
      const { error } = await supabase
        .from('triage_pattern_proposals')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', proposalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-proposals', currentOrganizationId] });
      toast.success('Forslag avvist');
    },
    onError: (err: Error) => toast.error(`Feil: ${err.message}`),
  });

  const runMining = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('triage-pattern-mining', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: unknown) => {
      const created = (data as { proposals_created?: number })?.proposals_created ?? 0;
      queryClient.invalidateQueries({ queryKey: ['triage-proposals', currentOrganizationId] });
      toast.success(created > 0 ? `${created} nye forslag generert` : 'Ingen nye forslag funnet');
    },
    onError: (err: Error) => toast.error(`Feil ved analyse: ${err.message}`),
  });

  return {
    ...proposalsQuery,
    acceptProposal,
    rejectProposal,
    runMining,
  };
}
