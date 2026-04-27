import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import type { MetaIntegration, MetaIntegrationStatus } from '../types';

const KEY = (orgId: string | null) => ['recruitment-meta-integration', orgId];

function generateToken() {
  // crypto.randomUUID is widely supported in modern browsers
  return (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useMetaIntegration() {
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY(currentOrganizationId),
    enabled: !!currentOrganizationId,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<MetaIntegration | null> => {
      if (!currentOrganizationId) return null;
      const { data, error } = await supabase
        .from('recruitment_meta_integrations' as any)
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as MetaIntegration) ?? null;
    },
  });

  const createIntegration = useMutation({
    mutationFn: async (input: {
      page_id: string;
      page_name: string;
      page_access_token: string | null;
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      const { data, error } = await supabase
        .from('recruitment_meta_integrations' as any)
        .insert({
          organization_id: currentOrganizationId,
          page_id: input.page_id,
          page_name: input.page_name,
          page_access_token: input.page_access_token,
          verify_token: generateToken(),
          status: 'configured' as MetaIntegrationStatus,
          created_by: profile?.id ?? null,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as MetaIntegration;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(currentOrganizationId) }),
  });

  const updateIntegration = useMutation({
    mutationFn: async (input: {
      id: string;
      page_name?: string;
      page_id?: string;
      page_access_token?: string | null;
      status?: MetaIntegrationStatus;
      status_message?: string | null;
    }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('recruitment_meta_integrations' as any)
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as MetaIntegration;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(currentOrganizationId) }),
  });

  const regenerateVerifyToken = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('recruitment_meta_integrations' as any)
        .update({ verify_token: generateToken() })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as unknown as MetaIntegration;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(currentOrganizationId) }),
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_meta_integrations' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(currentOrganizationId) }),
  });

  return {
    integration: query.data ?? null,
    isLoading: query.isLoading,
    createIntegration,
    updateIntegration,
    regenerateVerifyToken,
    deleteIntegration,
  };
}
