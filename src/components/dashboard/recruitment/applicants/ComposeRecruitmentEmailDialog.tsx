import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Paperclip, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  useRecruitmentInboxes,
  useApplicantFiles,
  useSendRecruitmentEmail,
} from '@/hooks/recruitment/useRecruitmentEmail';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { substituteMergeFields } from '../admin/templates/mergeFields';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  applicant: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
  conversationId?: string;
}

export const ComposeRecruitmentEmailDialog: React.FC<Props> = ({ open, onOpenChange, applicant, conversationId }) => {
  const { currentOrganizationId } = useOrganizationStore();
  const { profile } = useAuth();
  const { data: inboxes, isLoading: inboxesLoading } = useRecruitmentInboxes();
  const { data: files } = useApplicantFiles(applicant.id);

  const [inboxId, setInboxId] = useState<string>('');
  const [templateId, setTemplateId] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  const sendMut = useSendRecruitmentEmail();

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTemplateId('');
      setSubject('');
      setBodyHtml('');
      setAttachmentIds([]);
      setScheduleEnabled(false);
      setScheduleAt('');
    }
  }, [open]);

  // Default inbox = first
  useEffect(() => {
    if (open && !inboxId && inboxes && inboxes.length > 0) {
      setInboxId(inboxes[0].id);
    }
  }, [open, inboxes, inboxId]);

  const { data: templates } = useQuery({
    queryKey: ['recruitment-email-templates-active', currentOrganizationId],
    enabled: !!currentOrganizationId && open,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .select('id, name, subject, body')
        .eq('organization_id', currentOrganizationId!)
        .eq('is_active', true)
        .is('soft_deleted_at', null)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const vars = useMemo(() => ({
    first_name: applicant.first_name || '',
    last_name: applicant.last_name || '',
    company_name: '',
    position_title: '',
    recruiter_name: profile?.full_name || '',
    recruiter_email: profile?.email || '',
    application_link: typeof window !== 'undefined'
      ? `${window.location.origin}/operations/recruitment/applicants/${applicant.id}`
      : '',
  }), [applicant, profile]);

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const tpl = (templates ?? []).find((t: any) => t.id === id);
    if (tpl) {
      setSubject(substituteMergeFields(tpl.subject || '', vars));
      setBodyHtml(substituteMergeFields(tpl.body || '', vars));
    }
  };

  const canSend = !!inboxId && !!subject.trim() && !!bodyHtml.trim() && !!applicant.email
    && (!scheduleEnabled || !!scheduleAt);

  const handleSend = async () => {
    if (!applicant.email) {
      toast.error('Søkeren mangler e-postadresse');
      return;
    }
    const attachments = (files ?? [])
      .filter((f: any) => attachmentIds.includes(f.id))
      .map((f: any) => ({
        applicant_file_id: f.id,
        storage_path: f.storage_path,
        filename: f.file_name,
      }));

    let scheduledIso: string | null = null;
    if (scheduleEnabled && scheduleAt) {
      const dt = new Date(scheduleAt);
      if (Number.isNaN(dt.getTime())) {
        toast.error('Ugyldig planlagt tidspunkt');
        return;
      }
      if (dt.getTime() < Date.now() + 60_000) {
        toast.error('Velg et tidspunkt minst 1 minutt fram i tid');
        return;
      }
      scheduledIso = dt.toISOString();
    }

    try {
      const result = await sendMut.mutateAsync({
        applicant_id: applicant.id,
        conversation_id: conversationId,
        inbox_id: inboxId,
        subject,
        body_html: bodyHtml,
        attachments,
        scheduled_for: scheduledIso,
      });
      if (result.scheduled) {
        toast.success('E-post planlagt');
      } else {
        toast.success('E-post sendt');
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Sending feilet');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!sendMut.isPending) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send e-post til {applicant.first_name} {applicant.last_name}</DialogTitle>
          <DialogDescription>
            {applicant.email || 'Mangler e-postadresse'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Innboks</Label>
            <Select value={inboxId} onValueChange={setInboxId}>
              <SelectTrigger>
                <SelectValue placeholder={inboxesLoading ? 'Laster...' : 'Velg innboks'} />
              </SelectTrigger>
              <SelectContent>
                {(inboxes ?? []).map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!inboxesLoading && (inboxes?.length ?? 0) === 0 && (
              <p className="text-xs text-destructive mt-1">
                Ingen rekrutterings-innboks. Opprett én under Admin → Innbokser med formål «recruitment».
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block">Mal (valgfri)</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger><SelectValue placeholder="Velg mal eller skriv fritt" /></SelectTrigger>
              <SelectContent>
                {(templates ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-1.5 block">Emne</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Emne" />
          </div>

          <div>
            <Label className="mb-1.5 block">Innhold</Label>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              placeholder="Skriv meldingen… (HTML støttet)"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Flettefelt: {'{{first_name}}'}, {'{{last_name}}'}, {'{{recruiter_name}}'}, {'{{application_link}}'}
            </p>
          </div>

          {(files?.length ?? 0) > 0 && (
            <div>
              <Label className="mb-1.5 block flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" /> Vedlegg fra søkerens filer
              </Label>
              <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                {(files ?? []).map((f: any) => (
                  <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={attachmentIds.includes(f.id)}
                      onCheckedChange={(c) => {
                        setAttachmentIds(prev => c ? [...prev, f.id] : prev.filter(id => id !== f.id));
                      }}
                    />
                    <span className="truncate">{f.file_name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Vedlegg sendes som signerte lenker som utløper etter standardperioden.
              </p>
            </div>
          )}

          <div className="space-y-2 border-t pt-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={scheduleEnabled} onCheckedChange={(c) => setScheduleEnabled(!!c)} />
              <CalendarIcon className="h-3.5 w-3.5" /> Planlegg sending
            </label>
            {scheduleEnabled && (
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sendMut.isPending}>
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={!canSend || sendMut.isPending}>
            {sendMut.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {scheduleEnabled ? 'Planlegg' : 'Send nå'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComposeRecruitmentEmailDialog;
