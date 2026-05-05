import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface RecruitmentTag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  description: string | null;
  display_order: number;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

async function getMyProfileId(userId: string, orgId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .maybeSingle();
  return data?.id ?? null;
}

export function useTags(opts: { includeArchived?: boolean } = {}) {
  const { currentOrganizationId } = useOrganizationStore();
  return useQuery({
    queryKey: ['recruitment-tags', currentOrganizationId, opts.includeArchived ?? false],
    enabled: !!currentOrganizationId,
    staleTime: 60_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<RecruitmentTag[]> => {
      let q = supabase
        .from('recruitment_tags')
        .select('*')
        .eq('organization_id', currentOrganizationId!)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (!opts.includeArchived) q = q.is('archived_at', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as RecruitmentTag[];
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationStore();

  return useMutation({
    mutationFn: async (input: { name: string; color: string; description?: string | null }) => {
      if (!user || !currentOrganizationId) throw new Error('Not authenticated');
      const profileId = await getMyProfileId(user.id, currentOrganizationId);
      const { data: existing } = await supabase
        .from('recruitment_tags')
        .select('display_order')
        .eq('organization_id', currentOrganizationId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (existing?.display_order ?? -1) + 1;
      const { data, error } = await supabase
        .from('recruitment_tags')
        .insert({
          organization_id: currentOrganizationId,
          name: input.name.trim(),
          color: input.color,
          description: input.description?.trim() || null,
          display_order: nextOrder,
          created_by: profileId,
        })
        .select()
        .single();
      if (error) throw error;
      return data as RecruitmentTag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-tags'] });
      toast.success('Etikett opprettet');
    },
    onError: (err: any) => toast.error(err?.message || 'Kunne ikke opprette etikett'),
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      color?: string;
      description?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.trim();
      if (input.color !== undefined) patch.color = input.color;
      if (input.description !== undefined) patch.description = input.description?.trim() || null;
      const { data, error } = await supabase
        .from('recruitment_tags')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data as RecruitmentTag;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-tags'] });
      toast.success('Etikett oppdatert');
    },
    onError: (err: any) => toast.error(err?.message || 'Kunne ikke oppdatere etikett'),
  });
}

export function useArchiveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recruitment_tags')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-tags'] });
      toast.success('Etikett arkivert');
    },
    onError: (err: any) => toast.error(err?.message || 'Kunne ikke arkivere etikett'),
  });
}

export function useReorderTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Sequential per-id update — small set, RLS-friendly
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from('recruitment_tags')
          .update({ display_order: i })
          .eq('id', orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-tags'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Kunne ikke endre rekkefølge'),
  });
}
