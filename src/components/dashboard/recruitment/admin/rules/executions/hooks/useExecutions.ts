import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { AutomationExecution } from '../types';

interface UseExecutionsOptions {
  limit: number;
  offset: number;
  statusFilter?: 'failed' | 'success' | 'partial' | 'dry_run' | null;
}

export function useExecutions(options: UseExecutionsOptions) {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);

  return useQuery({
    queryKey: [
      'recruitment-automation-executions',
      orgId,
      options.limit,
      options.offset,
      options.statusFilter ?? null,
    ],
    queryFn: async (): Promise<{ data: AutomationExecution[]; totalCount: number }> => {
      const baseQuery = supabase
        .from('recruitment_automation_executions')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .range(options.offset, options.offset + options.limit - 1);

      const query = options.statusFilter
        ? baseQuery.eq('overall_status', options.statusFilter)
        : baseQuery;

      const { data, error, count } = await query;
      if (error) throw error;

      const rows = ((data ?? []) as unknown as AutomationExecution[]).map((row) => ({
        ...row,
        rule_name: row.rule_name ?? null,
      }));

      const applicantIds = Array.from(
        new Set(rows.map((row) => row.applicant_id).filter((value): value is string => !!value)),
      );
      const profileIds = Array.from(
        new Set(
          rows
            .flatMap((row) => [row.triggered_by, row.acknowledged_by])
            .filter((value): value is string => !!value),
        ),
      );

      const [applicantsResult, profilesResult] = await Promise.all([
        applicantIds.length
          ? supabase
              .from('applicants')
              .select('id, first_name, last_name')
              .in('id', applicantIds)
          : Promise.resolve({ data: [], error: null }),
        profileIds.length
          ? supabase.from('profiles').select('id, full_name, email').in('id', profileIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (applicantsResult.error) throw applicantsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const applicantNameById = new Map(
        (applicantsResult.data ?? []).map((applicant) => [
          applicant.id,
          `${applicant.first_name ?? ''} ${applicant.last_name ?? ''}`.trim() || '—',
        ]),
      );
      const profileNameById = new Map(
        (profilesResult.data ?? []).map((profile) => [
          profile.id,
          profile.full_name ?? profile.email ?? 'Ukjent bruker',
        ]),
      );

      return {
        data: rows.map((row) => ({
          ...row,
          applicant_name: row.applicant_id ? applicantNameById.get(row.applicant_id) ?? null : null,
          triggered_by_name: row.triggered_by
            ? profileNameById.get(row.triggered_by) ?? null
            : null,
          acknowledged_by_name: row.acknowledged_by
            ? profileNameById.get(row.acknowledged_by) ?? null
            : null,
        })),
        totalCount: count ?? 0,
      };
    },
    enabled: !!orgId,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}