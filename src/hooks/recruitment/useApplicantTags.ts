import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { RecruitmentTag } from './useTags';

export interface ApplicantTagLink {
  id: string;
  applicant_id: string;
  tag_id: string;
  added_at: string;
  recruitment_tags: Pick<RecruitmentTag, 'id' | 'name' | 'color' | 'archived_at'> | null;
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

export function useApplicantTags(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-tags', applicantId],
    enabled: !!applicantId,
    staleTime: 30_000,
    queryFn: async (): Promise<ApplicantTagLink[]> => {
      const { data, error } = await supabase
        .from('recruitment_applicant_tags')
        .select('id, applicant_id, tag_id, added_at, recruitment_tags(id, name, color, archived_at)')
        .eq('applicant_id', applicantId!)
        .order('added_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicantTagLink[];
    },
  });
}

export function useApplicantTagsByIds(applicantIds: string[]) {
  return useQuery({
    queryKey: ['applicant-tags-batch', [...applicantIds].sort().join(',')],
    enabled: applicantIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_applicant_tags')
        .select('id, applicant_id, tag_id, added_at, recruitment_tags(id, name, color, archived_at)')
        .in('applicant_id', applicantIds);
      if (error) throw error;
      const map: Record<string, ApplicantTagLink[]> = {};
      for (const row of (data ?? []) as unknown as ApplicantTagLink[]) {
        (map[row.applicant_id] ??= []).push(row);
      }
      return map;
    },
  });
}

export function useAddApplicantTag() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationStore();

  return useMutation({
    mutationFn: async (input: { applicant_id: string; tag_id: string }) => {
      if (!user || !currentOrganizationId) throw new Error('Not authenticated');
      const profileId = await getMyProfileId(user.id, currentOrganizationId);
      const { error } = await supabase
        .from('recruitment_applicant_tags')
        .insert({
          applicant_id: input.applicant_id,
          tag_id: input.tag_id,
          organization_id: currentOrganizationId,
          added_by: profileId,
        });
      if (error && !/duplicate key/i.test(error.message)) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-tags', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['applicant-tags-batch'] });
      qc.invalidateQueries({ queryKey: ['applicants'] });
      qc.invalidateQueries({ queryKey: ['applicant-events', vars.applicant_id] });
    },
    onError: (err: any) => toast.error(err?.message || 'Kunne ikke legge til etikett'),
  });
}

export function useRemoveApplicantTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { applicant_id: string; tag_id: string }) => {
      const { error } = await supabase
        .from('recruitment_applicant_tags')
        .delete()
        .eq('applicant_id', input.applicant_id)
        .eq('tag_id', input.tag_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-tags', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['applicant-tags-batch'] });
      qc.invalidateQueries({ queryKey: ['applicants'] });
      qc.invalidateQueries({ queryKey: ['applicant-events', vars.applicant_id] });
    },
    onError: (err: any) => toast.error(err?.message || 'Kunne ikke fjerne etikett'),
  });
}
