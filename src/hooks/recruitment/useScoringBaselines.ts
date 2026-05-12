import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  max_score?: number;
}

export interface ScoringRubric {
  criteria: RubricCriterion[];
  instructions?: string;
  include_files?: boolean;
  include_custom_fields?: boolean;
}

export interface ScoringBaseline {
  id: string;
  organization_id: string;
  name: string;
  rubric: ScoringRubric;
  is_default: boolean;
  soft_deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const KEY = (orgId: string | null) => ['scoring-baselines', orgId];

export function useScoringBaselines() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useQuery({
    queryKey: KEY(orgId),
    enabled: !!orgId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<ScoringBaseline[]> => {
      const { data, error } = await supabase
        .from('org_scoring_baselines' as any)
        .select('*')
        .eq('organization_id', orgId!)
        .is('soft_deleted_at', null)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useCreateScoringBaseline() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  const { profile } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; rubric: ScoringRubric; is_default?: boolean }) => {
      if (!orgId) throw new Error('Ingen organisasjon valgt');
      const { data, error } = await supabase
        .from('org_scoring_baselines' as any)
        .insert({
          organization_id: orgId,
          name: input.name,
          rubric: input.rubric as any,
          is_default: input.is_default ?? false,
          created_by: profile?.id ?? null,
        } as any)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });
}

export function useUpdateScoringBaseline() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; rubric?: ScoringRubric; is_default?: boolean }) => {
      const { id, ...patch } = input;
      const { data, error } = await supabase
        .from('org_scoring_baselines' as any)
        .update(patch as any)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });
}

export function useDeleteScoringBaseline() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('org_scoring_baselines' as any)
        .update({ soft_deleted_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(orgId) }),
  });
}
