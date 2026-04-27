import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExportParams {
  applicant_id?: string;
  date_range?: { from?: string; to?: string };
  format: 'csv' | 'json';
  include?: {
    applicant_data?: boolean;
    applications?: boolean;
    notes?: boolean;
    files?: boolean;
    automation_events?: boolean;
    ingestion_events?: boolean;
  };
}

export function useAuditExport() {
  return useMutation({
    mutationFn: async (params: ExportParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Ikke autentisert');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-export`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Eksport feilet: ${res.status} ${text}`);
      }

      const blob = await res.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      const scope = params.applicant_id ? `applicant-${params.applicant_id.slice(0, 8)}` : 'all';
      const filename = `recruitment-audit-${scope}-${stamp}.${params.format}`;

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(downloadUrl);

      return { filename, size: blob.size };
    },
  });
}
