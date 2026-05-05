import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';

export interface ApplicantConversationRow {
  id: string;
  subject: string | null;
  status: string;
  updated_at: string;
  received_at: string | null;
  inbox_id: string | null;
  preview_text: string | null;
  last_message_sender_type: string | null;
}

export function useApplicantConversations(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-conversations', applicantId],
    enabled: !!applicantId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<ApplicantConversationRow[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, subject, status, updated_at, received_at, inbox_id, preview_text, last_message_sender_type')
        .eq('applicant_id', applicantId!)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicantConversationRow[];
    },
  });
}

export interface ScheduledEmailRow {
  id: string;
  subject: string;
  to_email: string;
  scheduled_for: string;
  status: string;
  applicant_id: string | null;
  conversation_id: string | null;
  error_message: string | null;
  created_at: string;
}

export function useApplicantScheduledEmails(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-scheduled-emails', applicantId],
    enabled: !!applicantId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<ScheduledEmailRow[]> => {
      const { data, error } = await supabase
        .from('recruitment_scheduled_emails')
        .select('id, subject, to_email, scheduled_for, status, applicant_id, conversation_id, error_message, created_at')
        .eq('applicant_id', applicantId!)
        .in('status', ['pending', 'processing', 'failed'])
        .order('scheduled_for', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScheduledEmailRow[];
    },
  });
}

export function useRecruitmentInboxes() {
  const { currentOrganizationId } = useOrganizationStore();
  return useQuery({
    queryKey: ['recruitment-inboxes', currentOrganizationId],
    enabled: !!currentOrganizationId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name, color, is_default, purpose')
        .eq('organization_id', currentOrganizationId!)
        .eq('is_active', true)
        .eq('purpose', 'recruitment')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useApplicantFiles(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-files', applicantId],
    enabled: !!applicantId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applicant_files')
        .select('id, file_name, file_type, storage_path, file_size, created_at')
        .eq('applicant_id', applicantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface SendRecruitmentEmailInput {
  applicant_id?: string;
  conversation_id?: string;
  inbox_id: string;
  template_id?: string;
  subject?: string;
  body_html?: string;
  attachments?: { storage_path: string; filename: string; applicant_file_id?: string }[];
  scheduled_for?: string | null;
  to_email?: string;
}

export function useSendRecruitmentEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendRecruitmentEmailInput) => {
      const { data, error } = await supabase.functions.invoke('send-recruitment-email', {
        body: input,
      });
      if (error) throw new Error(error.message || 'send-recruitment-email feilet');
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { sent?: boolean; scheduled?: boolean; conversation_id?: string; id?: string };
    },
    onSuccess: (_data, vars) => {
      if (vars.applicant_id) {
        qc.invalidateQueries({ queryKey: ['applicant-conversations', vars.applicant_id] });
        qc.invalidateQueries({ queryKey: ['applicant-scheduled-emails', vars.applicant_id] });
        qc.invalidateQueries({ queryKey: ['applicant-events', vars.applicant_id] });
      }
    },
  });
}

export function useAttachConversationToApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { conversation_id: string; applicant_id: string }) => {
      const { data, error } = await supabase.functions.invoke('attach-conversation-to-applicant', {
        body: input,
      });
      if (error) throw new Error(error.message || 'attach feilet');
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['applicant-conversations', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Samtale knyttet til søker');
    },
    onError: (e: any) => toast.error(e?.message || 'Kunne ikke knytte samtale'),
  });
}

export function useDetachConversationFromApplicant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { conversation_id: string }) => {
      const { data, error } = await supabase.functions.invoke('detach-conversation-from-applicant', {
        body: input,
      });
      if (error) throw new Error(error.message || 'detach feilet');
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-conversations'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Samtale frakoblet');
    },
    onError: (e: any) => toast.error(e?.message || 'Kunne ikke frakoble samtale'),
  });
}

export function useCancelScheduledEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await supabase
        .from('recruitment_scheduled_emails')
        .update({ status: 'cancelled' })
        .eq('id', input.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-scheduled-emails'] });
      toast.success('Planlagt e-post avbrutt');
    },
    onError: (e: any) => toast.error(e?.message || 'Kunne ikke avbryte'),
  });
}
