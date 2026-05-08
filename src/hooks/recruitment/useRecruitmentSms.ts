import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { toast } from 'sonner';

export interface SmsConversationRow {
  id: string;
  status: string;
  updated_at: string;
  received_at: string | null;
  inbox_id: string | null;
  preview_text: string | null;
  last_message_sender_type: string | null;
}

export function useApplicantSmsConversations(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-sms-conversations', applicantId],
    enabled: !!applicantId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<SmsConversationRow[]> => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, status, updated_at, received_at, inbox_id, preview_text, last_message_sender_type')
        .eq('applicant_id', applicantId!)
        .eq('channel', 'sms')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SmsConversationRow[];
    },
  });
}

export interface SmsMessageRow {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
  sms_status: string | null;
  sms_segments: number | null;
  sms_provider: string | null;
  sms_provider_message_id: string | null;
}

export function useApplicantSmsMessages(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-sms-messages', conversationId],
    enabled: !!conversationId,
    refetchOnMount: 'always',
    staleTime: 10_000,
    queryFn: async (): Promise<SmsMessageRow[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_type, created_at, sms_status, sms_segments, sms_provider, sms_provider_message_id')
        .eq('conversation_id', conversationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SmsMessageRow[];
    },
  });
}

export interface ScheduledSmsRow {
  id: string;
  body: string;
  to_phone: string;
  scheduled_for: string;
  status: string;
  applicant_id: string | null;
  conversation_id: string | null;
  error_message: string | null;
  created_at: string;
}

export function useApplicantScheduledSms(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['applicant-scheduled-sms', applicantId],
    enabled: !!applicantId,
    refetchOnMount: 'always',
    queryFn: async (): Promise<ScheduledSmsRow[]> => {
      const { data, error } = await supabase
        .from('recruitment_scheduled_sms')
        .select('id, body, to_phone, scheduled_for, status, applicant_id, conversation_id, error_message, created_at')
        .eq('applicant_id', applicantId!)
        .in('status', ['pending', 'processing', 'failed'])
        .order('scheduled_for', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScheduledSmsRow[];
    },
  });
}

export function useSmsRecruitmentInboxes() {
  const { currentOrganizationId } = useOrganizationStore();
  return useQuery({
    queryKey: ['recruitment-sms-inboxes', currentOrganizationId],
    enabled: !!currentOrganizationId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name, color, is_default, purpose, sms_provider, sms_provider_phone_number, sms_enabled')
        .eq('organization_id', currentOrganizationId!)
        .eq('is_active', true)
        .eq('purpose', 'recruitment')
        .eq('sms_enabled', true)
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface SendRecruitmentSmsInput {
  applicant_id?: string;
  conversation_id?: string;
  inbox_id: string;
  template_id?: string;
  body?: string;
  scheduled_for?: string | null;
  to_phone?: string;
}

export function useSendRecruitmentSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SendRecruitmentSmsInput) => {
      const { data, error } = await supabase.functions.invoke('send-recruitment-sms', {
        body: input,
      });
      if (error) throw new Error(error.message || 'send-recruitment-sms feilet');
      if ((data as any)?.error) {
        const d = data as any;
        throw new Error(d.details ? `${d.error}: ${d.details}` : d.error);
      }
      return data as { sent?: boolean; scheduled?: boolean; conversation_id?: string; id?: string };
    },
    onSuccess: (_d, vars) => {
      if (vars.applicant_id) {
        qc.invalidateQueries({ queryKey: ['applicant-sms-conversations', vars.applicant_id] });
        qc.invalidateQueries({ queryKey: ['applicant-scheduled-sms', vars.applicant_id] });
      }
      if (vars.conversation_id) {
        qc.invalidateQueries({ queryKey: ['applicant-sms-messages', vars.conversation_id] });
      }
    },
  });
}

export function useCancelScheduledSms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const { error } = await supabase
        .from('recruitment_scheduled_sms')
        .update({ status: 'cancelled' })
        .eq('id', input.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applicant-scheduled-sms'] });
      toast.success('Planlagt SMS avbrutt');
    },
    onError: (e: any) => toast.error(e?.message || 'Kunne ikke avbryte'),
  });
}

export function useSmsTemplates() {
  const { currentOrganizationId } = useOrganizationStore();
  return useQuery({
    queryKey: ['recruitment-sms-templates', currentOrganizationId],
    enabled: !!currentOrganizationId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .select('id, name, body, description, is_active')
        .eq('organization_id', currentOrganizationId!)
        .eq('type', 'sms')
        .eq('is_active', true)
        .is('soft_deleted_at', null)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}
