import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Send, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  useSmsRecruitmentInboxes,
  useSendRecruitmentSms,
  useSmsTemplates,
} from '@/hooks/recruitment/useRecruitmentSms';
import { calculateSegments, toE164 } from '@/utils/smsUtils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicant: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  };
  conversationId?: string;
}

export const ComposeRecruitmentSmsDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  applicant,
  conversationId,
}) => {
  const { data: inboxes } = useSmsRecruitmentInboxes();
  const { data: templates } = useSmsTemplates();
  const sendMut = useSendRecruitmentSms();

  const [inboxId, setInboxId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [body, setBody] = useState('');
  const [toPhone, setToPhone] = useState(applicant.phone || '');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  useEffect(() => {
    if (open && inboxes && inboxes.length > 0 && !inboxId) {
      setInboxId(inboxes[0].id);
    }
  }, [open, inboxes, inboxId]);

  useEffect(() => {
    if (open) setToPhone(applicant.phone || '');
  }, [open, applicant.phone]);

  const seg = useMemo(() => calculateSegments(body), [body]);

  const onTemplate = (tplId: string) => {
    setTemplateId(tplId);
    const tpl = (templates || []).find((t) => t.id === tplId);
    if (tpl) setBody(tpl.body || '');
  };

  const reset = () => {
    setTemplateId('');
    setBody('');
    setScheduleEnabled(false);
    setScheduledFor('');
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const onSend = async () => {
    if (!inboxId) return toast.error('Velg en innboks');
    if (!body.trim()) return toast.error('Skriv en melding');
    const normalized = toE164(toPhone, 'NO');
    if (!normalized.startsWith('+')) {
      return toast.error('Ugyldig telefonnummer (forventer E.164, f.eks. +47…)');
    }
    if (scheduleEnabled && !scheduledFor) {
      return toast.error('Velg planlagt tidspunkt');
    }
    try {
      const res = await sendMut.mutateAsync({
        applicant_id: applicant.id,
        conversation_id: conversationId,
        inbox_id: inboxId,
        body: body.trim(),
        to_phone: normalized,
        scheduled_for: scheduleEnabled ? new Date(scheduledFor).toISOString() : null,
      });
      if (res?.scheduled) toast.success('SMS planlagt');
      else toast.success('SMS sendt');
      handleClose(false);
    } catch (e: any) {
      toast.error(e?.message || 'Kunne ikke sende SMS');
    }
  };

  const noInboxes = !inboxes || inboxes.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Send SMS til {applicant.first_name} {applicant.last_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {noInboxes && (
            <div className="text-sm text-destructive border border-destructive/40 rounded-md p-3 bg-destructive/5">
              Ingen rekrutteringsinnboks har SMS aktivert. Konfigurer dette under Admin → Integrasjoner.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Innboks</Label>
              <Select value={inboxId} onValueChange={setInboxId}>
                <SelectTrigger><SelectValue placeholder="Velg innboks" /></SelectTrigger>
                <SelectContent>
                  {(inboxes || []).map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} {i.sms_provider_phone_number ? `(${i.sms_provider_phone_number})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mal (valgfri)</Label>
              <Select value={templateId} onValueChange={onTemplate}>
                <SelectTrigger><SelectValue placeholder="Ingen" /></SelectTrigger>
                <SelectContent>
                  {(templates || []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Til (telefon, E.164)</Label>
            <Input value={toPhone} onChange={(e) => setToPhone(e.target.value)} placeholder="+47…" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Melding</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="resize-none"
              placeholder="Skriv SMS…"
            />
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>{seg.length} tegn · {seg.encoding}</span>
              <span>
                {seg.segments || 0} {seg.segments === 1 ? 'segment' : 'segmenter'}
                {seg.segments > 0 && ` · ${seg.remaining} igjen`}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
              />
              <CalendarIcon className="h-3.5 w-3.5" /> Planlegg sending
            </label>
            {scheduleEnabled && (
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Avbryt</Button>
          <Button onClick={onSend} disabled={sendMut.isPending || noInboxes || !body.trim()}>
            {sendMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {scheduleEnabled ? 'Planlegg' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComposeRecruitmentSmsDialog;
