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

      // Stages live as a JSONB array on recruitment_pipelines.stages, not a separate table.
      const { data: pipeline, error: pipelineError } = await db
        .from('recruitment_pipelines')
        .select('stages')
        .eq('organization_id', orgId!)
        .eq('is_default', true)
        .maybeSingle();

      if (pipelineError) throw pipelineError;

      const stageMap = new Map<string, { name: string; color: string | null }>();
      if (pipeline?.stages && Array.isArray(pipeline.stages)) {
        (pipeline.stages as any[]).forEach((stage) => {
          if (stage?.id) {
            stageMap.set(String(stage.id), {
              name: String(stage.name ?? ''),
              color: stage.color ?? null,
            });
          }
        });
      }

      return ((applicants ?? []) as any[]).map((applicant: any) => {
        const currentStageId = applicant.applications?.[0]?.current_stage_id ?? null;
        const currentStage = currentStageId ? stageMap.get(String(currentStageId)) : null;

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
