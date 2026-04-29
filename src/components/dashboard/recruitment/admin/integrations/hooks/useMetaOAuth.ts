import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { MetaIntegration } from '../types';

export const META_EXPECTED_SCOPES = [
  'leads_retrieval',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
] as const;

export type MetaExpectedScope = (typeof META_EXPECTED_SCOPES)[number];

export interface MetaOAuthStateRow {
  id: string;
  oauth_user_id: string | null;
  oauth_user_name: string | null;
  token_expires_at: string | null;
  mode: 'create' | 'reconnect';
  existing_integration_id: string | null;
}

export interface MetaPageOption {
  id: string;
  name: string;
  can_manage: boolean;
}

export interface MetaPageListResult {
  pages: MetaPageOption[];
  granted_scopes: string[];
  oauth_user_id: string | null;
  oauth_user_name: string | null;
  token_expires_at: string | null;
  mode: 'create' | 'reconnect';
  existing_integration_id: string | null;
}

export interface MetaFormDiscoveryResult {
  forms: Array<{ id: string; name: string; status: string; created_time: string | null }> | null;
  scope_missing: boolean;
  error_message?: string;
}

function invokeOrThrow<T>(fnName: string, body: unknown): Promise<T> {
  return supabase.functions.invoke(fnName, { body }).then(({ data, error }) => {
    // Per memory: check { error } directly — invoke does not throw on HTTP 5xx.
    if (error) {
      const msg = (error as any)?.message ?? `${fnName} feilet`;
      throw new Error(msg);
    }
    if (data && typeof data === 'object' && (data as any).error) {
      throw new Error(String((data as any).error));
    }
    return data as T;
  });
}

/** Kicks off OAuth: server returns auth_url, browser navigates to Facebook. */
export function useStartMetaOAuth() {
  return useMutation({
    mutationFn: async (input: {
      mode?: 'create' | 'reconnect';
      existing_integration_id?: string | null;
    }) => {
      const data = await invokeOrThrow<{ auth_url: string; state_id: string }>(
        'meta-oauth-init',
        {
          mode: input.mode ?? 'create',
          existing_integration_id: input.existing_integration_id ?? null,
        }
      );
      // Hand off to Facebook. Browser leaves the SPA at this point.
      window.location.assign(data.auth_url);
      return data;
    },
  });
}

/** Loads the oauth_state row by id (after the FB redirect lands back). */
export function useMetaOAuthState(stateId: string | null) {
  return useQuery<MetaOAuthStateRow | null>({
    queryKey: ['meta-oauth-state', stateId],
    enabled: !!stateId,
    refetchOnMount: 'always',
    staleTime: 0,
    queryFn: async () => {
      if (!stateId) return null;
      const { data, error } = await supabase
        .from('recruitment_meta_oauth_states' as any)
        .select('id, oauth_user_id, oauth_user_name, token_expires_at, mode, existing_integration_id')
        .eq('id', stateId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MetaOAuthStateRow) ?? null;
    },
  });
}

/** Lists the FB pages the OAuth user manages, plus the granted scopes. */
export function useMetaPageList(stateId: string | null) {
  return useQuery<MetaPageListResult | null>({
    queryKey: ['meta-oauth-page-list', stateId],
    enabled: !!stateId,
    refetchOnMount: 'always',
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      if (!stateId) return null;
      return invokeOrThrow<MetaPageListResult>('meta-oauth-list-pages', { state_id: stateId });
    },
  });
}

/** Derives the page token, subscribes the webhook, upserts the integration row. */
export function useFinalizeMetaOAuth() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  return useMutation({
    mutationFn: async (input: { state_id: string; page_id: string }) => {
      return invokeOrThrow<{ integration: MetaIntegration }>('meta-oauth-finalize', input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-meta-integration', currentOrganizationId] });
    },
  });
}

/** Auto-discovers leadgen forms for a configured integration. */
export function useDiscoverMetaForms(integrationId: string | null, enabled = true) {
  return useQuery<MetaFormDiscoveryResult | null>({
    queryKey: ['meta-discover-forms', integrationId],
    enabled: !!integrationId && enabled,
    refetchOnMount: 'always',
    staleTime: 0,
    retry: false,
    queryFn: async () => {
      if (!integrationId) return null;
      return invokeOrThrow<MetaFormDiscoveryResult>('meta-list-leadgen-forms', {
        integration_id: integrationId,
      });
    },
  });
}

/** Manual-path: subscribe page to leadgen webhook for an existing integration. */
export function useSubscribeWebhookManual() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  return useMutation({
    mutationFn: async (input: { integration_id: string }) => {
      return invokeOrThrow<{ success: true }>('meta-integration-subscribe-webhook', input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-meta-integration', currentOrganizationId] });
    },
  });
}
