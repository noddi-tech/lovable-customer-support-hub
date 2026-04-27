Fix the two dry-run hooks that query a non-existent table (`recruitment_pipeline_stages`). Stages live as a JSONB array on `recruitment_pipelines.stages` for the org's default pipeline.

## Files to modify

- `src/components/dashboard/recruitment/admin/rules/dryrun/hooks/useStages.ts`
- `src/components/dashboard/recruitment/admin/rules/dryrun/hooks/useApplicantsSearch.ts`

## Fix 1: `useStages.ts`

Replace the table query with a JSONB extraction.

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import type { StageOption } from '../types';

export function useStages() {
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  const db = supabase as any;

  return useQuery({
    queryKey: ['recruitment-automation-dry-run-stages', orgId],
    queryFn: async (): Promise<StageOption[]> => {
      const { data, error } = await db
        .from('recruitment_pipelines')
        .select('stages')
        .eq('organization_id', orgId!)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      if (!data?.stages || !Array.isArray(data.stages)) return [];

      return (data.stages as any[])
        .slice()
        .sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0))
        .map((stage) => ({
          id: String(stage.id),
          name: String(stage.name ?? ''),
          color: stage.color ?? null,
          order_index: Number(stage.order ?? 0),
        })) as StageOption[];
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}
```

Notes:
- `.maybeSingle()` instead of `.single()` so missing default pipeline returns null without throwing.
- Sort defensively by `order` field (the JSONB stage shape).
- Map to existing `StageOption` interface (`id`, `name`, `color`, `order_index`).

## Fix 2: `useApplicantsSearch.ts`

Replace the second `recruitment_pipeline_stages` lookup with a single fetch of the org's default pipeline's `stages` JSONB, then build an in-memory id → {name, color} map for enrichment.

```ts
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
```

Notes:
- Single pipeline fetch per applicant search (small JSONB blob, fine).
- Removes the broken `.in('id', stageIds)` against the non-existent table.
- Stage id comparison done as strings to match slug shape (`"qualified"` etc.).

## Verification

1. `Hvilken fase` dropdown lists all default-pipeline stages in `order` ascending.
2. Applicant typeahead shows correct stage badges with Norwegian names + colors.
3. Selecting a stage and running dry-run completes without errors.
4. TypeScript compiles cleanly (uses existing `StageOption` and `ApplicantSearchResult` types unchanged; `db = supabase as any` keeps PostgREST typing relaxed as elsewhere in the file).

## Reply after implementation

1. Updated `useStages.ts` contents
2. Updated stage-enrichment portion of `useApplicantsSearch.ts`
3. Confirmation TypeScript compiles cleanly
