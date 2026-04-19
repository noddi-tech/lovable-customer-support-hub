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

export interface CreateJobPositionInput {
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
    mutationFn: async (input: CreateJobPositionInput) => {
      if (!currentOrganizationId) {
        throw new Error('No organization selected');
      }

      const { data, error } = await supabase
        .from('job_positions')
        .insert({
          ...input,
          status: 'draft',
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
