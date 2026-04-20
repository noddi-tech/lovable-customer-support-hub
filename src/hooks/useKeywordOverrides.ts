import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';

export interface KeywordOverrides {
  disabled: string[];
  added: string[];
}

export interface CategoryThresholds {
  [category: string]: number;
}

/**
 * Base critical keywords — kept in sync with `_shared/critical-routing.ts`.
 * Duplicated here so the UI can render them without an extra API call.
 */
export const BASE_CRITICAL_KEYWORDS = [
  'booking', "can't book", 'cannot book', 'payment failed', 'payment error',
  'error', 'not working', 'broken', 'down', 'outage', "can't access",
  'unable to', 'fails', 'failure', 'critical', 'urgent',
  'kan ikke bestille', 'bestilling feilet', 'bestilling feiler',
  'betaling feilet', 'betaling feiler', 'betalingsfeil',
  'fungerer ikke', 'virker ikke', 'funker ikke',
  'feil', 'feilmelding', 'feiler',
  'nedetid', 'ødelagt', 'nede',
  'får ikke til', 'klarer ikke', 'ikke tilgjengelig',
  'kritisk', 'haster', 'akutt',
  'kan ikke logge inn', 'innlogging feiler',
  'appen krasjer', 'krasjer', 'tom side', 'blank side',
];

export function useKeywordOverrides() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

  const overridesQuery = useQuery({
    queryKey: ['slack-keyword-overrides', currentOrganizationId],
    enabled: !!currentOrganizationId,
    queryFn: async (): Promise<{ overrides: KeywordOverrides; thresholds: CategoryThresholds }> => {
      if (!currentOrganizationId) throw new Error('No org');
      const { data, error } = await supabase
        .from('slack_integrations')
        .select('critical_keyword_overrides, critical_ai_severity_thresholds')
        .eq('organization_id', currentOrganizationId)
        .maybeSingle();
      if (error) throw error;
      const ov = (data?.critical_keyword_overrides as KeywordOverrides) || { disabled: [], added: [] };
      return {
        overrides: { disabled: ov.disabled || [], added: ov.added || [] },
        thresholds: (data?.critical_ai_severity_thresholds as CategoryThresholds) || {},
      };
    },
  });

  const updateOverrides = useMutation({
    mutationFn: async (next: KeywordOverrides) => {
      if (!currentOrganizationId) throw new Error('No org');
      const { error } = await supabase
        .from('slack_integrations')
        .update({ critical_keyword_overrides: next })
        .eq('organization_id', currentOrganizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-keyword-overrides', currentOrganizationId] });
      toast.success('Nøkkelord oppdatert');
    },
    onError: (err: Error) => toast.error(`Feil: ${err.message}`),
  });

  const updateThresholds = useMutation({
    mutationFn: async (next: CategoryThresholds) => {
      if (!currentOrganizationId) throw new Error('No org');
      const { error } = await supabase
        .from('slack_integrations')
        .update({ critical_ai_severity_thresholds: next })
        .eq('organization_id', currentOrganizationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['slack-keyword-overrides', currentOrganizationId] });
      toast.success('Terskel oppdatert');
    },
    onError: (err: Error) => toast.error(`Feil: ${err.message}`),
  });

  const unmuteKeyword = useMutation({
    mutationFn: async (muteId: string) => {
      const { error } = await supabase.from('critical_keyword_mutes').delete().eq('id', muteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triage-health', currentOrganizationId] });
      toast.success('Demping fjernet');
    },
    onError: (err: Error) => toast.error(`Feil: ${err.message}`),
  });

  return {
    ...overridesQuery,
    updateOverrides,
    updateThresholds,
    unmuteKeyword,
  };
}
