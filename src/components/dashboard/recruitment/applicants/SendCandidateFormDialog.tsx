import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, MessageSquare, Send, ShieldAlert, Info, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRecruitmentInboxes } from '@/hooks/recruitment/useRecruitmentEmail';
import { useSmsRecruitmentInboxes } from '@/hooks/recruitment/useRecruitmentSms';
import { useSendCandidateForm } from '@/hooks/recruitment/useCandidateFormTokens';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { EmailTemplateTipTap } from '../admin/templates/EmailTemplateTipTap';
import { substituteMergeFields } from '../admin/templates/mergeFields';

interface Props {
  open: boolean;
  /** Page-mounted (memory #3). */
  onOpenChange: (o: boolean) => void;
  applicationId: string;
  applicantId: string;
  applicantName: string;
  hasEmail: boolean;
  hasPhone: boolean;
}

const DEFAULT_TPL_NAME = 'Kandidatskjema – invitasjon';
const SMS_TPL_NAME = 'Kandidatskjema – invitasjon (SMS)';

const SendCandidateFormDialog: React.FC<Props> = ({
  open, onOpenChange, applicationId, applicantId, applicantName, hasEmail, hasPhone,
}) => {
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [expiryDays, setExpiryDays] = useState(7);
  const [inboxId, setInboxId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');

  const [templateId, setTemplateId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');

  const send = useSendCandidateForm();
  const { profile } = useAuth();
  const { currentOrganizationId } = useOrganizationStore();

  const { data: emailInboxes } = useRecruitmentInboxes();
  const { data: smsInboxes } = useSmsRecruitmentInboxes();

  // Fetch the data needed for variable interpolation in preview.
  const { data: ctx } = useQuery({
    queryKey: ['send-skjema-context', applicationId],
    enabled: !!applicationId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id, organization_id,
          applicants:applicant_id(first_name, last_name),
          job_positions:position_id(title),
          organization:organization_id(name)
        `)
        .eq('id', applicationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setExpiryDays(7);
      setCustomMessage('');
      setTemplateId('');
      setSubject('');
      setBodyHtml('');
      if (hasEmail) setChannel('email');
      else if (hasPhone) setChannel('sms');
    }
  }, [open, hasEmail, hasPhone]);

  // Default inbox selection
  useEffect(() => {
    if (channel === 'email' && !inboxId && emailInboxes?.length) {
      setInboxId(emailInboxes[0].id);
    }
    if (channel === 'sms' && smsInboxes?.length && !smsInboxes.find((i: any) => i.id === inboxId)) {
      setInboxId(smsInboxes[0].id);
    }
  }, [channel, emailInboxes, smsInboxes, inboxId]);

  const smsConfigured = (smsInboxes?.length ?? 0) > 0;
  const expiresAt = useMemo(
    () => new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
    [expiryDays],
  );
  const expiresHuman = useMemo(
    () => format(expiresAt, "d. MMMM yyyy 'kl.' HH:mm", { locale: nb }),
    [expiresAt],
  );

  // Email templates (all active, non-deleted email templates — including form-CTA ones).
  const { data: emailTemplates } = useQuery({
    queryKey: ['recruitment-email-templates-for-form', currentOrganizationId],
    enabled: !!currentOrganizationId && open && channel === 'email',
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .select('id, name, subject, body')
        .eq('organization_id', currentOrganizationId!)
        .eq('type', 'email')
        .eq('is_active', true)
        .is('soft_deleted_at', null)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // SMS template id resolved for "Rediger" deep-link (SMS keeps current minimal UI).
  const { data: smsTplRow } = useQuery({
    queryKey: ['candidate-form-sms-template-lookup', currentOrganizationId],
    enabled: !!currentOrganizationId && open && channel === 'sms',
    queryFn: async () => {
      const { data } = await supabase
        .from('recruitment_email_templates')
        .select('id, name')
        .eq('organization_id', currentOrganizationId!)
        .eq('type', 'sms')
        .eq('name', SMS_TPL_NAME)
        .is('soft_deleted_at', null)
        .maybeSingle();
      return data;
    },
  });

  const vars = useMemo<Record<string, string>>(() => {
    const applicant = (ctx as any)?.applicants ?? {};
    const position = (ctx as any)?.job_positions ?? {};
    const org = (ctx as any)?.organization ?? {};
    return {
      first_name: applicant.first_name || '',
      last_name: applicant.last_name || '',
      position_title: position.title || '',
      company_name: org.name || '',
      organization_name: org.name || '',
      recruiter_name: profile?.full_name || '',
      recruiter_email: profile?.email || '',
      application_link: typeof window !== 'undefined'
        ? `${window.location.origin}/operations/recruitment/applicants/${applicantId}`
        : '',
      // form_url + brand_color left as placeholders — filled server-side at send.
      expires_at: expiresHuman,
    };
  }, [ctx, profile, applicantId, expiresHuman]);

  // Auto-select default template once email templates load, prefill fields.
  useEffect(() => {
    if (channel !== 'email') return;
    if (!emailTemplates?.length) return;
    if (templateId) return;
    const def =
      emailTemplates.find((t: any) => t.name === DEFAULT_TPL_NAME) ?? emailTemplates[0];
    if (def) {
      setTemplateId(def.id);
      setSubject(substituteMergeFields(def.subject || '', vars));
      setBodyHtml(substituteMergeFields(def.body || '', vars));
    }
  }, [channel, emailTemplates, templateId, vars]);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = (emailTemplates ?? []).find((t: any) => t.id === id);
    if (tpl) {
      setSubject(substituteMergeFields(tpl.subject || '', vars));
      setBodyHtml(substituteMergeFields(tpl.body || '', vars));
      toast.info('Innhold byttet ut');
    }
  };

  const selectedTpl = (emailTemplates ?? []).find((t: any) => t.id === templateId);
  const editLink =
    channel === 'email' && selectedTpl
      ? `/admin/recruitment/templates/${selectedTpl.id}`
      : channel === 'sms' && smsTplRow?.id
        ? `/admin/recruitment/templates/${smsTplRow.id}`
        : null;

  const canSubmit =
    !send.isPending &&
    ((channel === 'email' && hasEmail && !!inboxId && !!subject.trim() && !!bodyHtml.trim()) ||
      (channel === 'sms' && hasPhone && smsConfigured && !!inboxId));

  const handleSend = async () => {
    try {
      await send.mutateAsync({
        application_id: applicationId,
        applicant_id: applicantId,
        channel,
        expiry_days: expiryDays,
        inbox_id: inboxId || undefined,
        custom_message: customMessage.trim() || undefined,
        template_id: channel === 'email' ? templateId || undefined : undefined,
        subject_override: channel === 'email' ? subject.trim() || undefined : undefined,
        body_html_override: channel === 'email' ? bodyHtml.trim() || undefined : undefined,
      });
      toast.success(`Skjema sendt til ${applicantName}`);
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !send.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Send skjema til {applicantName}
          </DialogTitle>
          <DialogDescription>
            Søkeren får en lenke for å fylle ut manglende informasjon selv. Lenken er
            personlig og krever bekreftelse av telefonnummer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground/70" />
            <p className="leading-relaxed">
              Send dette etter at kandidaten er kvalifisert eller flyttet til
              «Forhåndsscreening». Lenken lar dem fylle inn data som mangler, og
              AI-vurderingen blir automatisk oppdatert når de sender inn.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Kanal</Label>
            <RadioGroup
              value={channel}
              onValueChange={(v) => setChannel(v as 'email' | 'sms')}
              className="space-y-1.5"
            >
              <label
                className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer ${
                  !hasEmail ? 'opacity-50 cursor-not-allowed' : channel === 'email' ? 'border-primary' : ''
                }`}
              >
                <RadioGroupItem value="email" disabled={!hasEmail} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <Mail className="h-3.5 w-3.5" /> E-post
                  </div>
                  {!hasEmail && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Søkeren mangler e-postadresse.
                    </div>
                  )}
                </div>
              </label>
              <label
                className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer ${
                  !hasPhone || !smsConfigured
                    ? 'opacity-50 cursor-not-allowed'
                    : channel === 'sms'
                    ? 'border-primary'
                    : ''
                }`}
              >
                <RadioGroupItem
                  value="sms"
                  disabled={!hasPhone || !smsConfigured}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MessageSquare className="h-3.5 w-3.5" /> SMS
                  </div>
                  {!hasPhone && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Søkeren mangler telefonnummer.
                    </div>
                  )}
                  {hasPhone && !smsConfigured && (
                    <div className="text-xs text-amber-600 mt-0.5 inline-flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Messente ikke konfigurert — SMS sendes ikke
                    </div>
                  )}
                </div>
              </label>
            </RadioGroup>
          </div>

          {channel === 'email' && (
            <>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Mal</Label>
                  {editLink && (
                    <a
                      href={editLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Rediger valgt mal <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <Select value={templateId} onValueChange={handleTemplateChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Velg mal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(emailTemplates ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Skjemalenken legges automatisk til hvis malen ikke inneholder den.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Rekrutterings-innboks</Label>
                <Select value={inboxId} onValueChange={setInboxId}>
                  <SelectTrigger><SelectValue placeholder="Velg innboks..." /></SelectTrigger>
                  <SelectContent>
                    {(emailInboxes ?? []).map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="form-subject">Emne</Label>
                <Input
                  id="form-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Emne..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Innhold</Label>
                <EmailTemplateTipTap
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  placeholder="Innhold..."
                />
              </div>
            </>
          )}

          {channel === 'sms' && smsConfigured && (smsInboxes?.length ?? 0) > 1 && (
            <div className="space-y-1.5">
              <Label>SMS-innboks</Label>
              <Select value={inboxId} onValueChange={setInboxId}>
                <SelectTrigger><SelectValue placeholder="Velg innboks..." /></SelectTrigger>
                <SelectContent>
                  {(smsInboxes ?? []).map((i: any) => (
                    <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {channel === 'sms' && (
            <div className="space-y-1.5">
              <Label>Mal</Label>
              <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                <span className="truncate">{SMS_TPL_NAME}</span>
                {smsTplRow?.id ? (
                  <a
                    href={`/admin/recruitment/templates/${smsTplRow.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    Rediger <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Standardmal</span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Gyldighet</Label>
              <span className="text-xs text-muted-foreground">
                {expiryDays} dag{expiryDays === 1 ? '' : 'er'}
              </span>
            </div>
            <Slider
              value={[expiryDays]}
              onValueChange={(v) => setExpiryDays(v[0])}
              min={1}
              max={14}
              step={1}
            />
            <p className="text-xs text-muted-foreground">
              Utløper {format(expiresAt, "d. MMM yyyy 'kl.' HH:mm", { locale: nb })} (Oslo)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-msg">Egen melding (valgfritt)</Label>
            <Textarea
              id="custom-msg"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="F.eks. 'Vi vurderer søknaden din nå — kan du bekrefte tilgjengelighet?'"
            />
            <p className="text-xs text-muted-foreground">
              {channel === 'email'
                ? 'Settes inn rett over knappen i e-posten.'
                : 'Settes inn først i SMS-en.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={!canSubmit}>
            {send.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Send skjema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SendCandidateFormDialog;
