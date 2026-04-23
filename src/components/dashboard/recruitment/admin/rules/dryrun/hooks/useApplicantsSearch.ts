import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { sanitizeForPostgrest } from '@/utils/queryUtils';
import type { ApplicantSearchResult } from '../types';

export function useApplicantsSearch(query: string) {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  const normalizedQuery = query.trim();
  const db = supabase as any;

  return useQuery({
    queryKey: ['recruitment-automation-dry-run-applicants', orgId, normalizedQuery],
    queryFn: async (): Promise<ApplicantSearchResult[]> => {
      const safeQuery = sanitizeForPostgrest(normalizedQuery);
      if (!safeQuery) return [];

      const { data: applicants, error: applicantsError } = await db
        .from('applicants')
        .select('id, first_name, last_name, email, applications(current_stage_id)')
        .eq('organization_id', orgId!)
        .or(`first_name.ilike.%${safeQuery}%,last_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (applicantsError) throw applicantsError;

      const stageIds = Array.from(
        new Set(
          ((applicants ?? []) as any[])
            .flatMap((applicant: any) => applicant.applications ?? [])
            .map((application: any) => application?.current_stage_id)
            .filter((value: unknown): value is string => typeof value === 'string' && value.length > 0),
        ),
      );

      const { data: stages, error: stagesError } = stageIds.length
        ? await db
            .from('recruitment_pipeline_stages')
            .select('id, name, color')
            .eq('organization_id', orgId!)
            .in('id', stageIds)
        : { data: [], error: null };

      if (stagesError) throw stagesError;

      const stageMap = new Map(
        ((stages ?? []) as any[]).map((stage) => [stage.id, { name: stage.name, color: stage.color ?? null }]),
      );

      return ((applicants ?? []) as any[]).map((applicant: any) => {
        const currentStageId = applicant.applications?.[0]?.current_stage_id ?? null;
        const currentStage = currentStageId ? stageMap.get(currentStageId) : null;

        return {
          id: applicant.id,
          first_name: applicant.first_name ?? null,
          last_name: applicant.last_name ?? null,
          email: applicant.email ?? null,
          current_stage_id: currentStageId,
          current_stage_name: currentStage?.name ?? null,
          current_stage_color: currentStage?.color ?? null,
        } satisfies ApplicantSearchResult;
      });
    },
    enabled: !!orgId && normalizedQuery.length >= 2,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}
