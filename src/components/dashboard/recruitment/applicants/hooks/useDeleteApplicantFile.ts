import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useDeleteApplicantFile() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      fileId: string;
      applicantId: string;
      applicationId?: string | null;
      storagePath: string;
      fileName: string;
      fileType: string;
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');

      // 1) Storage delete first — abort on failure (avoid orphan rows).
      const { error: storageErr } = await supabase.storage
        .from('applicant-files')
        .remove([input.storagePath]);
      if (storageErr) throw storageErr;

      // 2) DB row delete (audit trigger captures DELETE on applicant_files).
      const { error: rowErr } = await supabase
        .from('applicant_files')
        .delete()
        .eq('id', input.fileId);
      if (rowErr) throw rowErr;

      // 3) Optional event entry for visible-in-timeline UX.
      if (input.applicationId && profile?.id) {
        await supabase.from('application_events').insert({
          application_id: input.applicationId,
          applicant_id: input.applicantId,
          organization_id: currentOrganizationId,
          event_type: 'file_deleted',
          event_data: { file_name: input.fileName, file_type: input.fileType },
          performed_by: profile.id,
        });
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-files', vars.applicantId] });
      qc.invalidateQueries({ queryKey: ['applicant-events', vars.applicantId] });
      qc.invalidateQueries({ queryKey: ['recruitment-audit-events'] });
      toast.success('Fil slettet');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke slette fil');
    },
  });
}
