import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, MessageSquare, Send, Copy, ShieldAlert, Info, ExternalLink } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';



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

const SendCandidateFormDialog: React.FC<Props> = ({
  open, onOpenChange, applicationId, applicantId, applicantName, hasEmail, hasPhone,
}) => {
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [expiryDays, setExpiryDays] = useState(7);
  const [inboxId, setInboxId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const send = useSendCandidateForm();

  const { data: emailInboxes } = useRecruitmentInboxes();
  const { data: smsInboxes } = useSmsRecruitmentInboxes();

  // Reset state when reopened
  useEffect(() => {
    if (open) {
      setExpiryDays(7);
      setCustomMessage('');
      // Pick channel based on what's available
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

  const canSubmit =
    !send.isPending &&
    ((channel === 'email' && hasEmail && !!inboxId) ||
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
      });
      toast.success(`Skjema sendt til ${applicantName}`);
      // Defer close to let Radix release focus/body locks cleanly.
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !send.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
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
