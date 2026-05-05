import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';

export type BulkAction =
  | 'move_stage'
  | 'assign'
  | 'reject'
  | 'hire'
  | 'send_email'
  | 'add_tags'
  | 'remove_tags'
  | 'delete'
  | 'export_csv';

export interface BulkActionPayload {
  stage_id?: string;
  assignee_id?: string | null;
  reason?: string;
  template_id?: string;
  inbox_id?: string;
  tag_ids?: string[];
}

export interface BulkActionResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped?: number;
  skipped_reasons?: { applicant_id: string; reason: string }[];
  errors: { applicant_id: string; message: string }[];
  download?: { filename: string; csv_base64: string };
}

function downloadCsv(filename: string, csvBase64: string) {
  // Decode base64 to bytes (preserves BOM + UTF-8)
  const bin = atob(csvBase64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const ACTION_LABELS: Record<BulkAction, string> = {
  move_stage: 'flyttet',
  assign: 'tildelt',
  reject: 'avvist',
  hire: 'ansatt',
  send_email: 'sendt e-post',
  add_tags: 'fått etiketter',
  remove_tags: 'fjernet etiketter fra',
  delete: 'slettet',
  export_csv: 'eksportert',
};

export function useBulkApplicantAction() {
  const qc = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

  return useMutation({
    mutationFn: async (input: {
      applicant_ids: string[];
      action: BulkAction;
      payload?: BulkActionPayload;
    }): Promise<BulkActionResult> => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      if (input.applicant_ids.length === 0) throw new Error('Ingen søkere valgt');
      if (input.applicant_ids.length > 500) {
        throw new Error('Maks 500 søkere per operasjon. Velg færre.');
      }

      const { data, error } = await supabase.functions.invoke('bulk-applicant-action', {
        body: {
          organization_id: currentOrganizationId,
          applicant_ids: input.applicant_ids,
          action: input.action,
          payload: input.payload ?? {},
        },
      });
      if (error) throw new Error(error.message || 'Bulk-handling feilet');
      return data as BulkActionResult;
    },
    onSuccess: (result, vars) => {
      const verb = ACTION_LABELS[vars.action];
      const total = result.processed;
      const skipped = result.skipped ?? 0;
      if (result.download) {
        downloadCsv(result.download.filename, result.download.csv_base64);
      }
      if (result.failed > 0) {
        toast.error(
          `${result.succeeded} av ${total} søkere ${verb}. ${result.failed} feilet.`,
          { duration: 8000 }
        );
      } else if (skipped > 0) {
        toast.success(
          `${result.succeeded} av ${total} søkere ${verb}. ${skipped} hoppet over (manglende samtykke).`
        );
      } else {
        toast.success(`${result.succeeded} av ${total} søkere ${verb}`);
      }

      qc.invalidateQueries({ queryKey: ['applicants'] });
      qc.invalidateQueries({ queryKey: ['oversikt-metrics'] });
      qc.invalidateQueries({ queryKey: ['recruitment-pipeline-board'] });
      qc.invalidateQueries({ queryKey: ['applicant-tags-batch'] });
      vars.applicant_ids.forEach((id) => {
        qc.invalidateQueries({ queryKey: ['applicant', id] });
        qc.invalidateQueries({ queryKey: ['applicant-tags', id] });
        qc.invalidateQueries({ queryKey: ['applicant-events', id] });
      });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Bulk-handling feilet');
    },
  });
}
