import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

export type RequirementType = 'required' | 'optional';

export interface StageFieldRequirement {
  id: string;
  organization_id: string;
  pipeline_id: string;
  stage_id: string;
  custom_field_id: string;
  position_id: string | null;
  requirement_type: RequirementType;
  block_stage_progression: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const KEY = (pipelineId: string | null | undefined, positionId: string | null | undefined) => [
  'stage-field-requirements',
  pipelineId ?? null,
  positionId ?? 'org',
];

/** If positionId is provided, returns rows where position_id is null OR equals positionId.
 *  If positionId is null, returns only org-wide (position_id null) rows. */
export function useStageFieldRequirements(
  pipelineId: string | null | undefined,
  positionId?: string | null,
) {
  return useQuery({
    queryKey: KEY(pipelineId, positionId ?? null),
    enabled: !!pipelineId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<StageFieldRequirement[]> => {
      let q = supabase
        .from('pipeline_stage_field_requirements' as any)
        .select('*')
        .eq('pipeline_id', pipelineId!);
      if (positionId === undefined || positionId === null) {
        q = q.is('position_id', null);
      } else {
        q = q.or(`position_id.is.null,position_id.eq.${positionId}`);
      }
      const { data, error } = await q.order('stage_id').order('display_order');
      if (error) throw error;
      return (data ?? []) as any;
    },
  });
}

export function useUpsertStageFieldRequirement() {
  const qc = useQueryClient();
  const orgId = useOrganizationStore((s) => s.currentOrganizationId);
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      pipeline_id: string;
      stage_id: string;
      custom_field_id: string;
      position_id?: string | null;
      requirement_type: RequirementType;
      block_stage_progression?: boolean;
      display_order?: number;
    }) => {
      if (!orgId) throw new Error('Ingen organisasjon valgt');
      const payload = {
        organization_id: orgId,
        pipeline_id: input.pipeline_id,
        stage_id: input.stage_id,
        custom_field_id: input.custom_field_id,
        position_id: input.position_id ?? null,
        requirement_type: input.requirement_type,
        block_stage_progression:
          input.block_stage_progression ?? input.requirement_type === 'required',
        display_order: input.display_order ?? 0,
      };
      if (input.id) {
        const { data, error } = await supabase
          .from('pipeline_stage_field_requirements' as any)
          .update(payload as any)
          .eq('id', input.id)
          .select('*')
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('pipeline_stage_field_requirements' as any)
        .insert(payload as any)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stage-field-requirements'] }),
  });
}

export function useDeleteStageFieldRequirement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pipeline_stage_field_requirements' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stage-field-requirements'] }),
  });
}
