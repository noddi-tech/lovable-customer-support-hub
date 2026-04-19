import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';

export interface JobPositionRow {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  campaign: string | null;
  employment_type: string;
  status: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  pipeline_id: string | null;
  requirements: any;
  created_at: string;
  updated_at: string;
  organization_id: string;
  applications: { count: number }[];
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Utkast',
  open: 'Åpen',
  paused: 'Pauset',
  closed: 'Lukket',
};

export function useJobPositions() {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['job-positions', currentOrganizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_positions')
        .select('*, applications(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as JobPositionRow[];
    },
    enabled: !!currentOrganizationId,
  });
}

export interface JobPositionDetail {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  campaign: string | null;
  employment_type: string;
  status: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  pipeline_id: string | null;
  requirements: any;
  created_at: string;
  updated_at: string;
  organization_id: string;
  finn_listing_url: string | null;
  meta_lead_form_id: string | null;
  published_at: string | null;
  closes_at: string | null;
  recruitment_pipelines: { id: string; name: string } | null;
}

export function useJobPosition(id: string | undefined) {
  return useQuery({
    queryKey: ['job-position', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('job_positions')
        .select('*, recruitment_pipelines(id, name)')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown as JobPositionDetail) ?? null;
    },
    enabled: !!id,
  });
}

export interface PipelineRow {
  id: string;
  name: string;
  is_default: boolean;
}

export function useRecruitmentPipelines() {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['recruitment-pipelines', currentOrganizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_pipelines')
        .select('id, name, is_default')
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;
      return (data ?? []) as PipelineRow[];
    },
    enabled: !!currentOrganizationId,
  });
}

export interface JobPositionFormPayload {
  title: string;
  description: string | null;
  location: string | null;
  campaign: string | null;
  employment_type: string;
  salary_range_min: number | null;
  salary_range_max: number | null;
  pipeline_id: string | null;
  requirements: {
    drivers_license: string[];
    min_experience_years: number | null;
    certifications: string[];
  };
}

export function useCreateJobPosition() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();

  return useMutation({
    mutationFn: async (
      input: JobPositionFormPayload & { publishImmediately?: boolean },
    ) => {
      if (!currentOrganizationId) {
        throw new Error('No organization selected');
      }

      const { publishImmediately, ...rest } = input;
      const status = publishImmediately ? 'open' : 'draft';

      const { data, error } = await supabase
        .from('job_positions')
        .insert({
          ...rest,
          status,
          published_at: publishImmediately ? new Date().toISOString() : null,
          organization_id: currentOrganizationId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-positions'] });
      toast.success('Stilling opprettet');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Kunne ikke opprette stilling');
    },
  });
}

export function useUpdateJobPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: JobPositionFormPayload }) => {
      const { data, error } = await supabase
        .from('job_positions')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['job-position', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['job-positions'] });
      toast.success('Stilling oppdatert');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Kunne ikke oppdatere stilling');
    },
  });
}

export function useUpdateJobPositionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      currentPublishedAt,
    }: {
      id: string;
      status: string;
      currentPublishedAt: string | null;
    }) => {
      const patch: Record<string, any> = { status };
      if (status === 'open' && !currentPublishedAt) {
        patch.published_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('job_positions')
        .update(patch)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['job-position', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['job-positions'] });
      const label = STATUS_LABELS[vars.status] ?? vars.status;
      toast.success(`Status endret til ${label}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Kunne ikke endre status');
    },
  });
}

// Backwards-compat alias
export type CreateJobPositionInput = JobPositionFormPayload;
