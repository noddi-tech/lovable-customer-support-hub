import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeForPostgrest } from '@/utils/queryUtils';
import { toast } from 'sonner';

export interface ApplicantRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  source: string;
  created_at: string;
  import_status?: string | null;
  imported_via?: string | null;
  applications: {
    id: string;
    current_stage_id: string;
    score: number | null;
    assigned_to: string | null;
    applied_at: string;
    position_id: string;
    job_positions: { id: string; title: string } | null;
  }[];
}

export interface ApplicantsFilters {
  search: string;
  source: string;
  positionId: string;
  stageId: string;
  pendingReviewOnly?: boolean;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export function useApplicants(filters: ApplicantsFilters) {
  const { currentOrganizationId } = useOrganizationStore();
  const { search, source, positionId, stageId, pendingReviewOnly } = filters;

  return useQuery({
    queryKey: ['applicants', currentOrganizationId, search, source, positionId, stageId, pendingReviewOnly],
    queryFn: async () => {
      const useInner = positionId !== 'all' || stageId !== 'all';
      const select = useInner
        ? '*, applications!inner(id, current_stage_id, score, assigned_to, applied_at, position_id, job_positions(id, title))'
        : '*, applications(id, current_stage_id, score, assigned_to, applied_at, position_id, job_positions(id, title))';

      let q = supabase
        .from('applicants')
        .select(select)
        .order('created_at', { ascending: false });

      if (source !== 'all') q = q.eq('source', source);
      if (positionId !== 'all') q = q.eq('applications.position_id', positionId);
      if (stageId !== 'all') q = q.eq('applications.current_stage_id', stageId);
      if (pendingReviewOnly) q = (q as any).eq('import_status', 'pending_review');

      if (search.trim()) {
        const safe = sanitizeForPostgrest(search.trim());
        if (safe) {
          q = q.or(
            `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,phone.ilike.%${safe}%`
          );
        }
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ApplicantRow[];
    },
    enabled: !!currentOrganizationId,
    refetchOnMount: 'always',
  });
}

export function useApplicantPipeline() {
  const { currentOrganizationId } = useOrganizationStore();

  return useQuery({
    queryKey: ['recruitment-pipeline-default', currentOrganizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_pipelines')
        .select('id, name, stages')
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      const stages = Array.isArray((data as any).stages)
        ? ((data as any).stages as PipelineStage[])
        : [];
      return { id: data.id, name: data.name, stages };
    },
    enabled: !!currentOrganizationId,
    refetchOnMount: 'always',
  });
}

export interface CreateApplicantInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  position_id: string;
  source: string;
  qualifications: {
    drivers_license_classes: string[];
    years_experience: number | null;
    availability_date: string | null;
    language_norwegian: string;
    work_permit_status: string;
  };
  noteContent: string;
}

export function useCreateApplicant() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateApplicantInput): Promise<{ applicantId: string }> => {
      if (!currentOrganizationId) throw new Error('No organization selected');
      if (!profile?.id) throw new Error('No profile loaded');

      // 1. Insert applicant
      const { data: applicant, error: applicantErr } = await supabase
        .from('applicants')
        .insert({
          organization_id: currentOrganizationId,
          first_name: input.first_name,
          last_name: input.last_name,
          email: input.email,
          phone: input.phone,
          source: input.source,
          gdpr_consent: true,
          gdpr_consent_at: new Date().toISOString(),
          drivers_license_classes: input.qualifications.drivers_license_classes,
          years_experience: input.qualifications.years_experience,
          availability_date: input.qualifications.availability_date,
          language_norwegian: input.qualifications.language_norwegian,
          work_permit_status: input.qualifications.work_permit_status,
        })
        .select('id')
        .single();
      if (applicantErr) throw applicantErr;

      // 2. Insert application
      const { data: application, error: appErr } = await supabase
        .from('applications')
        .insert({
          applicant_id: applicant.id,
          position_id: input.position_id,
          current_stage_id: 'not_reviewed',
          organization_id: currentOrganizationId,
        })
        .select('id')
        .single();
      if (appErr) throw appErr;

      // 3. Insert created event
      const { error: evtErr } = await supabase.from('application_events').insert({
        application_id: application.id,
        applicant_id: applicant.id,
        organization_id: currentOrganizationId,
        event_type: 'created',
        event_data: { source: input.source },
        performed_by: profile.id,
      });
      if (evtErr) throw evtErr;

      // 4. Optional note
      const noteText = input.noteContent.trim();
      if (noteText) {
        const { error: noteErr } = await supabase.from('applicant_notes').insert({
          applicant_id: applicant.id,
          application_id: application.id,
          organization_id: currentOrganizationId,
          author_id: profile.id,
          note_type: 'internal',
          content: noteText,
        });
        if (noteErr) throw noteErr;

        const { error: noteEvtErr } = await supabase.from('application_events').insert({
          application_id: application.id,
          applicant_id: applicant.id,
          organization_id: currentOrganizationId,
          event_type: 'note_added',
          event_data: { note_type: 'internal', preview: noteText.slice(0, 100) },
          performed_by: profile.id,
        });
        if (noteEvtErr) throw noteEvtErr;
      }

      return { applicantId: applicant.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
      queryClient.invalidateQueries({ queryKey: ['job-positions'] });
      toast.success('Søker opprettet');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke opprette søker');
    },
  });
}
