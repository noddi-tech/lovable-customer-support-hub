import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ApplicantProfileData } from '../useApplicantProfile';

export type ApplicantPatch = Partial<{
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string;
  drivers_license_classes: string[];
  years_experience: number | null;
  certifications: string[];
  own_vehicle: boolean | null;
  availability_date: string | null;
  language_norwegian: string;
  work_permit_status: string;
  gdpr_consent: boolean;
  gdpr_consent_at: string | null;
}>;

export const EMAIL_CONFLICT = 'EMAIL_CONFLICT';

export function useUpdateApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: ApplicantPatch }) => {
      const { data, error } = await supabase
        .from('applicants')
        .update(input.patch as any)
        .eq('id', input.id)
        .select()
        .single();
      if (error) {
        const msg = (error.message || '').toLowerCase();
        if (error.code === '23505' && msg.includes('email')) {
          const e = new Error(EMAIL_CONFLICT);
          (e as any).code = EMAIL_CONFLICT;
          throw e;
        }
        throw error;
      }
      return data as unknown as ApplicantProfileData;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant', vars.id] });
      qc.invalidateQueries({ queryKey: ['applicants'] });
      qc.invalidateQueries({ queryKey: ['recruitment-audit-events'] });
      toast.success('Søker oppdatert');
    },
    onError: (err: any) => {
      if (err?.message === EMAIL_CONFLICT) {
        toast.error('E-post er allerede i bruk på en annen søker');
      } else {
        toast.error(err?.message || 'Kunne ikke oppdatere søker');
      }
    },
  });
}
