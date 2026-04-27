import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useDeleteApplicantNote() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      noteId: string;
      applicantId: string;
      applicationId?: string | null;
      preview?: string;
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');

      const { error } = await supabase
        .from('applicant_notes')
        .delete()
        .eq('id', input.noteId);
      if (error) throw error;

      if (input.applicationId && profile?.id) {
        await supabase.from('application_events').insert({
          application_id: input.applicationId,
          applicant_id: input.applicantId,
          organization_id: currentOrganizationId,
          event_type: 'note_deleted',
          event_data: { note_id: input.noteId, preview: input.preview?.slice(0, 100) ?? null },
          performed_by: profile.id,
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-notes', vars.applicantId] });
      qc.invalidateQueries({ queryKey: ['applicant-events', vars.applicantId] });
      qc.invalidateQueries({ queryKey: ['recruitment-audit-events'] });
      toast.success('Notat slettet');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke slette notat');
    },
  });
}
