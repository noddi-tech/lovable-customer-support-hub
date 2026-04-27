import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { LeadIngestionLogEntry } from '../types';

interface Options {
  limit?: number;
  offset?: number;
}

export function useLeadIngestionLog({ limit = 50, offset = 0 }: Options = {}) {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['recruitment-lead-ingestion-log', currentOrganizationId, limit, offset],
    enabled: !!currentOrganizationId,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async (): Promise<{ rows: LeadIngestionLogEntry[]; totalCount: number }> => {
      if (!currentOrganizationId) return { rows: [], totalCount: 0 };

      const { data, error, count } = await supabase
        .from('recruitment_lead_ingestion_log' as any)
        .select('*', { count: 'exact' })
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) throw error;

      const rows = (data ?? []) as unknown as LeadIngestionLogEntry[];

      // Enrich applicant names with separate query (no nested PostgREST joins)
      const applicantIds = Array.from(
        new Set(rows.map((r) => r.applicant_id).filter((v): v is string => !!v)),
      );
      let nameMap = new Map<string, string>();
      if (applicantIds.length > 0) {
        const { data: applicants, error: aErr } = await supabase
          .from('applicants')
          .select('id, first_name, last_name, email')
          .in('id', applicantIds);
        if (!aErr && applicants) {
          for (const a of applicants) {
            const full = [a.first_name, a.last_name].filter(Boolean).join(' ').trim();
            nameMap.set(a.id, full || a.email || '—');
          }
        }
      }

      return {
        rows: rows.map((r) => ({
          ...r,
          applicant_name: r.applicant_id ? nameMap.get(r.applicant_id) ?? null : null,
        })),
        totalCount: count ?? rows.length,
      };
    },
  });
}
