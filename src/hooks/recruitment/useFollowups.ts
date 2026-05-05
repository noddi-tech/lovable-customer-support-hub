import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Followup {
  id: string;
  organization_id: string;
  applicant_id: string;
  application_id: string | null;
  scheduled_for: string;
  note: string | null;
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  completed_by: string | null;
  snoozed_to: string | null;
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

export function useApplicantFollowups(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-followups', applicantId],
    enabled: !!applicantId,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<Followup[]> => {
      const { data, error } = await supabase
        .from('recruitment_followups' as any)
        .select('*')
        .eq('applicant_id', applicantId!)
        .is('completed_at', null)
        .order('scheduled_for', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Followup[];
    },
  });
}

export function useCreateFollowup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationStore();

  return useMutation({
    mutationFn: async (input: {
      applicant_id: string;
      application_id?: string | null;
      scheduled_for: string;
      note?: string | null;
      assigned_to?: string | null;
    }) => {
      if (!user || !currentOrganizationId) throw new Error('Not authenticated');
      const profileId = await getMyProfileId(user.id, currentOrganizationId);
      if (!profileId) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('recruitment_followups' as any)
        .insert({
          organization_id: currentOrganizationId,
          applicant_id: input.applicant_id,
          application_id: input.application_id ?? null,
          scheduled_for: input.scheduled_for,
          note: input.note ?? null,
          assigned_to: input.assigned_to ?? profileId,
          created_by: profileId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-followups', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['oversikt-metrics'] });
      toast({ title: 'Påminnelse opprettet' });
    },
    onError: (e: any) => toast({ title: 'Klarte ikke lagre påminnelse', description: e.message, variant: 'destructive' }),
  });
}

export function useCompleteFollowup() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { currentOrganizationId } = useOrganizationStore();

  return useMutation({
    mutationFn: async (followupId: string) => {
      if (!user || !currentOrganizationId) throw new Error('Not authenticated');
      const profileId = await getMyProfileId(user.id, currentOrganizationId);
      const { error } = await supabase
        .from('recruitment_followups' as any)
        .update({ completed_at: new Date().toISOString(), completed_by: profileId })
        .eq('id', followupId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-followups'] });
      qc.invalidateQueries({ queryKey: ['oversikt-metrics'] });
      toast({ title: 'Markert som fullført' });
    },
    onError: (e: any) => toast({ title: 'Klarte ikke fullføre', description: e.message, variant: 'destructive' }),
  });
}

export function useSnoozeFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; snoozed_to: string }) => {
      const { error } = await supabase
        .from('recruitment_followups' as any)
        .update({ snoozed_to: input.snoozed_to })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-followups'] });
      qc.invalidateQueries({ queryKey: ['oversikt-metrics'] });
      toast({ title: 'Påminnelse utsatt' });
    },
    onError: (e: any) => toast({ title: 'Klarte ikke utsette', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteFollowup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recruitment_followups' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-followups'] });
      qc.invalidateQueries({ queryKey: ['oversikt-metrics'] });
      toast({ title: 'Påminnelse slettet' });
    },
    onError: (e: any) => toast({ title: 'Klarte ikke slette', description: e.message, variant: 'destructive' }),
  });
}
