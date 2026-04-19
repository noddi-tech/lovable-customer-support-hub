import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ApplicantProfileApplication {
  id: string;
  current_stage_id: string;
  score: number | null;
  score_breakdown: any;
  assigned_to: string | null;
  applied_at: string;
  rejection_reason: string | null;
  position_id: string;
  job_positions: { id: string; title: string } | null;
}

export interface ApplicantProfileData {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  source: string;
  source_details: any;
  drivers_license_classes: string[];
  certifications: string[];
  years_experience: number | null;
  availability_date: string | null;
  language_norwegian: string;
  work_permit_status: string;
  own_vehicle: boolean | null;
  gdpr_consent: boolean;
  gdpr_consent_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  applications: ApplicantProfileApplication[];
}

export interface ApplicantEvent {
  id: string;
  applicant_id: string;
  application_id: string;
  event_type: string;
  event_data: any;
  notes: string | null;
  created_at: string;
  performed_by: string | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface ApplicantNote {
  id: string;
  applicant_id: string;
  application_id: string | null;
  content: string;
  note_type: string;
  created_at: string;
  author_id: string;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface ApplicantFile {
  id: string;
  applicant_id: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}

export function useApplicantProfile(id: string | undefined) {
  return useQuery({
    queryKey: ['applicant', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applicants')
        .select(
          '*, applications(id, current_stage_id, score, score_breakdown, assigned_to, applied_at, rejection_reason, position_id, job_positions(id, title))'
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ApplicantProfileData | null);
    },
    enabled: !!id,
  });
}

export function useApplicantEvents(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-events', applicantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('application_events')
        .select('*, profiles:performed_by(id, full_name, avatar_url)')
        .eq('applicant_id', applicantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicantEvent[];
    },
    enabled: !!applicantId,
  });
}

export function useApplicantNotes(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-notes', applicantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applicant_notes')
        .select('*, profiles:author_id(id, full_name, avatar_url)')
        .eq('applicant_id', applicantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicantNote[];
    },
    enabled: !!applicantId,
  });
}

export function useApplicantFiles(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-files', applicantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applicant_files')
        .select('*')
        .eq('applicant_id', applicantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ApplicantFile[];
    },
    enabled: !!applicantId,
  });
}

export function useUpdateApplicationStage() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      applicantId: string;
      fromStageId: string;
      toStageId: string;
      notify: 'email' | 'sms' | 'both' | 'skip';
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      if (!profile?.id) throw new Error('Ingen profil lastet');

      const { error: updErr } = await supabase
        .from('applications')
        .update({ current_stage_id: input.toStageId })
        .eq('id', input.applicationId);
      if (updErr) throw updErr;

      const { error: evtErr } = await supabase.from('application_events').insert({
        application_id: input.applicationId,
        applicant_id: input.applicantId,
        organization_id: currentOrganizationId,
        event_type: 'stage_change',
        event_data: { from: input.fromStageId, to: input.toStageId, notify: input.notify },
        performed_by: profile.id,
      });
      if (evtErr) throw evtErr;

      // TODO: trigger email/sms dispatch via edge function
      if (input.notify !== 'skip') {
        console.log('TODO: send notification', input.notify, input.applicantId);
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['applicant', vars.applicantId] });
      queryClient.invalidateQueries({ queryKey: ['applicant-events', vars.applicantId] });
      queryClient.invalidateQueries({ queryKey: ['applicants'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke endre status');
    },
  });
}

export function useAddApplicantNote() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      applicantId: string;
      applicationId?: string | null;
      content: string;
      note_type: string;
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      if (!profile?.id) throw new Error('Ingen profil lastet');

      const { error: noteErr } = await supabase.from('applicant_notes').insert({
        applicant_id: input.applicantId,
        application_id: input.applicationId ?? null,
        organization_id: currentOrganizationId,
        author_id: profile.id,
        note_type: input.note_type,
        content: input.content,
      });
      if (noteErr) throw noteErr;

      if (input.applicationId) {
        const { error: evtErr } = await supabase.from('application_events').insert({
          application_id: input.applicationId,
          applicant_id: input.applicantId,
          organization_id: currentOrganizationId,
          event_type: 'note_added',
          event_data: { note_type: input.note_type, preview: input.content.slice(0, 100) },
          performed_by: profile.id,
        });
        if (evtErr) throw evtErr;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['applicant-notes', vars.applicantId] });
      queryClient.invalidateQueries({ queryKey: ['applicant-events', vars.applicantId] });
      toast.success('Notat lagt til');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke legge til notat');
    },
  });
}

export function useLogApplicantEvent() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      applicantId: string;
      applicationId: string;
      event_type: string;
      event_data?: any;
      notes?: string | null;
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      if (!profile?.id) throw new Error('Ingen profil lastet');

      const { error } = await supabase.from('application_events').insert({
        application_id: input.applicationId,
        applicant_id: input.applicantId,
        organization_id: currentOrganizationId,
        event_type: input.event_type,
        event_data: input.event_data ?? {},
        notes: input.notes ?? null,
        performed_by: profile.id,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['applicant-events', vars.applicantId] });
      toast.success('Hendelse lagret');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke lagre hendelse');
    },
  });
}

export function useAssignApplication() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      applicationId: string;
      applicantId: string;
      profileId: string;
      profileName: string;
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      if (!profile?.id) throw new Error('Ingen profil lastet');

      const { error: updErr } = await supabase
        .from('applications')
        .update({ assigned_to: input.profileId })
        .eq('id', input.applicationId);
      if (updErr) throw updErr;

      const { error: evtErr } = await supabase.from('application_events').insert({
        application_id: input.applicationId,
        applicant_id: input.applicantId,
        organization_id: currentOrganizationId,
        event_type: 'assigned',
        event_data: { profile_id: input.profileId, name: input.profileName },
        performed_by: profile.id,
      });
      if (evtErr) throw evtErr;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['applicant', vars.applicantId] });
      queryClient.invalidateQueries({ queryKey: ['applicant-events', vars.applicantId] });
      toast.success(`Tilordnet til ${vars.profileName}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke tilordne');
    },
  });
}

export function useUploadApplicantFile() {
  const queryClient = useQueryClient();
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      applicantId: string;
      applicationId?: string | null;
      file: File;
      file_type: string;
    }) => {
      if (!currentOrganizationId) throw new Error('Ingen organisasjon valgt');
      if (!profile?.id) throw new Error('Ingen profil lastet');

      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${currentOrganizationId}/${input.applicantId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from('applicant-files')
        .upload(path, input.file, {
          contentType: input.file.type || 'application/octet-stream',
          upsert: false,
        });
      if (upErr) throw upErr;

      const { error: rowErr } = await supabase.from('applicant_files').insert({
        applicant_id: input.applicantId,
        organization_id: currentOrganizationId,
        file_name: input.file.name,
        file_type: input.file_type,
        file_size: input.file.size,
        storage_path: path,
        uploaded_by: profile.id,
      });
      if (rowErr) throw rowErr;

      if (input.applicationId) {
        const { error: evtErr } = await supabase.from('application_events').insert({
          application_id: input.applicationId,
          applicant_id: input.applicantId,
          organization_id: currentOrganizationId,
          event_type: 'file_uploaded',
          event_data: { file_name: input.file.name, file_type: input.file_type },
          performed_by: profile.id,
        });
        if (evtErr) throw evtErr;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['applicant-files', vars.applicantId] });
      queryClient.invalidateQueries({ queryKey: ['applicant-events', vars.applicantId] });
      toast.success('Fil lastet opp');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Kunne ikke laste opp fil');
    },
  });
}
