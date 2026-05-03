import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { BulkImport } from '@/components/dashboard/recruitment/admin/integrations/types';

export interface BulkImportStartInput {
  integration_id: string;
  form_mapping_ids: string[];
  since_date: string;
  until_date: string;
  approval_mode: 'direct' | 'quarantine';
  imported_pipeline_stage_id?: string | null;
}

export interface BulkImportStartResult {
  bulk_import_id?: string;
  dry_run?: boolean;
  totals_per_form?: Array<{
    form_mapping_id: string;
    form_name?: string | null;
    form_id?: string;
    leads_found?: number;
    mapping_complete?: boolean;
    mapping_status?: 'complete' | 'missing';
    error?: string | null;
    target_stage_id?: string | null;
  }>;
  total_leads_found?: number;
  scope_missing?: boolean;
  error?: string;
  message?: string;
}

export function useBulkImportStart() {
  return useMutation({
    mutationFn: async (input: BulkImportStartInput): Promise<BulkImportStartResult> => {
      const { data, error } = await supabase.functions.invoke('recruitment-bulk-import-start', {
        body: input,
      });
      if (error) throw new Error(error.message ?? 'Klarte ikke å starte import');
      if ((data as any)?.error && !(data as any).bulk_import_id) {
        return data as BulkImportStartResult;
      }
      return data as BulkImportStartResult;
    },
  });
}

export function useBulkImportExecute() {
  return useMutation({
    mutationFn: async (input: { bulk_import_id: string }) => {
      const { data, error } = await supabase.functions.invoke('recruitment-bulk-import-execute', {
        body: input,
      });
      if (error) throw new Error(error.message ?? 'Klarte ikke å starte kjøring');
      return data;
    },
  });
}

export interface BulkImportStatus {
  import: BulkImport;
  breakdown: { pending: number; imported: number; duplicate: number; unmapped: number; failed: number };
}

export function useBulkImportStatus(bulkImportId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['recruitment-bulk-import-status', bulkImportId],
    enabled: !!bulkImportId && enabled,
    refetchInterval: (query) => {
      const data = query.state.data as BulkImportStatus | undefined;
      if (!data) return 2000;
      const status = data.import.status;
      return status === 'running' || status === 'pending' ? 2000 : false;
    },
    queryFn: async (): Promise<BulkImportStatus> => {
      const { data, error } = await supabase.functions.invoke(
        'recruitment-bulk-import-status',
        { body: { bulk_import_id: bulkImportId } },
      );
      if (error) throw new Error(error.message ?? 'Kunne ikke hente status');
      return data as BulkImportStatus;
    },
  });
}

export function useBulkImportsList() {
  const { currentOrganizationId } = useOrganizationStore();
  return useQuery({
    queryKey: ['recruitment-bulk-imports', currentOrganizationId],
    enabled: !!currentOrganizationId,
    staleTime: 30_000,
    queryFn: async (): Promise<BulkImport[]> => {
      const { data, error } = await supabase
        .from('recruitment_bulk_imports')
        .select('*')
        .eq('organization_id', currentOrganizationId!)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as BulkImport[];
    },
  });
}

export function useInvalidateApplicantsAfterImport() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['applicants'] });
    qc.invalidateQueries({ queryKey: ['recruitment-bulk-imports'] });
  };
}
