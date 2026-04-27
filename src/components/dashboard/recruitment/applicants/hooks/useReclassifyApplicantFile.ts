import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useReclassifyApplicantFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { fileId: string; applicantId: string; file_type: string }) => {
      const { error } = await supabase
        .from('applicant_files')
        .update({ file_type: input.file_type })
        .eq('id', input.fileId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-files', vars.applicantId] });
      // Note: applicant_files has no updated_at — UPDATE not audit-captured.
      // Acceptable per spec (metadata-only change).
      toast.success('Filtype oppdatert');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke endre filtype');
    },
  });
}
