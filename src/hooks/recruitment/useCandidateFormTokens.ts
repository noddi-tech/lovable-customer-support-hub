import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CandidateFormTokenRow {
  id: string;
  applicant_id: string;
  application_id: string;
  organization_id: string;
  token: string;
  channel: string;
  created_at: string;
  created_by: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  opened_at: string | null;
  attempts: number;
  creator_name: string | null;
  revoker_name: string | null;
  triggered_by_rule_name: string | null;
}

export type FormTokenStatus =
  | 'revoked'
  | 'submitted'
  | 'expired'
  | 'opened'
  | 'sent';

export function deriveStatus(t: CandidateFormTokenRow): FormTokenStatus {
  if (t.revoked_at) return 'revoked';
  if (t.used_at) return 'submitted';
  if (new Date(t.expires_at) <= new Date()) return 'expired';
  if (t.opened_at) return 'opened';
  return 'sent';
}

/**
 * Live-fetched form tokens for an applicant.
 * Memory #5: refetchOnMount 'always' + 30s polling while open.
 */
export function useCandidateFormTokens(applicantId: string | undefined) {
  return useQuery({
    queryKey: ['candidate-form-tokens', applicantId],
    enabled: !!applicantId,
    refetchOnMount: 'always',
    refetchInterval: 30_000,
    queryFn: async (): Promise<CandidateFormTokenRow[]> => {
      const { data, error } = await supabase
        .from('candidate_form_tokens')
        .select(
          `id, applicant_id, application_id, organization_id, token, channel,
           created_at, created_by, expires_at, used_at, revoked_at, revoked_by,
           opened_at, attempts,
           creator:profiles!candidate_form_tokens_created_by_fkey(full_name),
           revoker:profiles!candidate_form_tokens_revoked_by_fkey(full_name)`
        )
        .eq('applicant_id', applicantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as any[];

      // Best-effort enrichment: find automation rule name from audit events.
      // System-issued rows have created_by = null and a matching audit event
      // with context.triggered_by_rule_id (set by the automation dispatcher).
      const systemRowIds = rows.filter((r) => !r.created_by).map((r) => r.id);
      let ruleNameById = new Map<string, string>();
      if (systemRowIds.length > 0) {
        const { data: auditRows } = await supabase
          .from('recruitment_audit_events')
          .select('subject_id, context')
          .eq('event_type', 'candidate_form_sent')
          .in('subject_id', systemRowIds);
        for (const a of auditRows ?? []) {
          const ctx = (a as any).context ?? {};
          const name = ctx.triggered_by_rule_name as string | undefined;
          if (name) ruleNameById.set((a as any).subject_id, name);
        }
      }

      return rows.map((r) => ({
        id: r.id,
        applicant_id: r.applicant_id,
        application_id: r.application_id,
        organization_id: r.organization_id,
        token: r.token,
        channel: r.channel,
        created_at: r.created_at,
        created_by: r.created_by,
        expires_at: r.expires_at,
        used_at: r.used_at,
        revoked_at: r.revoked_at,
        revoked_by: r.revoked_by,
        opened_at: r.opened_at,
        attempts: r.attempts ?? 0,
        creator_name: r.creator?.full_name ?? null,
        revoker_name: r.revoker?.full_name ?? null,
        triggered_by_rule_name: ruleNameById.get(r.id) ?? null,
      }));
    },
  });
}

export function useSendCandidateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      application_id: string;
      applicant_id: string;
      channel: 'email' | 'sms' | 'manual';
      expiry_days: number;
      inbox_id?: string;
      custom_message?: string;
      template_id?: string;
      subject_override?: string;
      body_html_override?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('generate-candidate-form-token', {
        body: {
          application_id: input.application_id,
          channel: input.channel,
          expiry_days: input.expiry_days,
          inbox_id: input.inbox_id,
          custom_message: input.custom_message,
          template_id: input.template_id,
          subject_override: input.subject_override,
          body_html_override: input.body_html_override,
        },
      });
      // Memory: check { error } from invoke directly — doesn't throw on 5xx.
      if (error) throw new Error(error.message || 'Kunne ikke sende skjema');
      if ((data as any)?.error) {
        throw new Error((data as any).message || (data as any).error);
      }
      return data as { token: string; url: string; expires_at: string };
    },
    onSuccess: (_data, vars) => {
      // Memory #13: invalidate after token creation.
      qc.invalidateQueries({ queryKey: ['candidate-form-tokens', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['applicant-events', vars.applicant_id] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Kunne ikke sende skjema');
    },
  });
}

export function useRevokeCandidateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { token_id: string; applicant_id: string }) => {
      const { data, error } = await supabase.functions.invoke('revoke-candidate-form-token', {
        body: { token_id: input.token_id },
      });
      if (error) throw new Error(error.message || 'Kunne ikke trekke tilbake');
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['candidate-form-tokens', vars.applicant_id] });
      qc.invalidateQueries({ queryKey: ['applicant-events', vars.applicant_id] });
      toast.success('Lenken er trukket tilbake');
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Kunne ikke trekke tilbake');
    },
  });
}
