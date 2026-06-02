import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GdprRequestRow {
  id: string;
  organization_id: string;
  applicant_id: string | null;
  applicant_name_snapshot: string;
  applicant_email_snapshot: string | null;
  request_type: 'export' | 'erasure';
  status: 'requested' | 'processing' | 'fulfilled' | 'failed';
  requested_by: string | null;
  requested_at: string;
  fulfilled_at: string | null;
  fulfillment_summary: any | null;
  error_message: string | null;
  reason_provided: string | null;
}

// Memory #5: refetchOnMount: 'always'.
// Poll every 5s while ANY request for this applicant is in flight.
export function useGdprRequests(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['gdpr-requests', applicantId],
    enabled: !!applicantId,
    refetchOnMount: 'always',
    refetchInterval: (query) => {
      const rows = (query.state.data ?? []) as GdprRequestRow[];
      const inFlight = rows.some(
        (r) => r.status === 'processing' || r.status === 'requested',
      );
      return inFlight ? 5_000 : false;
    },
    queryFn: async (): Promise<GdprRequestRow[]> => {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .eq('applicant_id', applicantId!)
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as GdprRequestRow[];
    },
  });
}

// Org-wide history (admin dashboard).
export function useOrgGdprRequests(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['gdpr-requests-org', organizationId],
    enabled: !!organizationId,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    queryFn: async (): Promise<GdprRequestRow[]> => {
      const { data, error } = await supabase
        .from('gdpr_requests')
        .select('*')
        .eq('organization_id', organizationId!)
        .order('requested_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as GdprRequestRow[];
    },
  });
}

export function useInitiateGdprExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { applicant_id: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke(
        'initiate-gdpr-export',
        { body: vars },
      );
      if (error) throw new Error(error.message || 'Eksport feilet');
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      return data as { request_id: string; status: string };
    },
    onSuccess: (_data, vars) => {
      toast.success('GDPR-eksport startet — sjekk historikken om noen sekunder');
      qc.invalidateQueries({ queryKey: ['gdpr-requests', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['gdpr-requests-org'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Kunne ikke starte eksport');
    },
  });
}

export function useInitiateGdprErasure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      applicant_id: string;
      confirm: boolean;
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        'initiate-gdpr-erasure',
        { body: vars },
      );
      if (error) throw new Error(error.message || 'Sletting feilet');
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      return data as { request_id: string; status: string };
    },
    onSuccess: (_data, vars) => {
      toast.success('Sletting initiert');
      qc.invalidateQueries({ queryKey: ['gdpr-requests', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['gdpr-requests-org'] });
      qc.invalidateQueries({ queryKey: ['applicant', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['applicants'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Kunne ikke slette kandidat');
    },
  });
}
