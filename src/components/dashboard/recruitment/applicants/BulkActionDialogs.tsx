import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useApplicantPipeline, type PipelineStage } from './useApplicants';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TagPicker } from './TagPicker';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useOrganizationStore } from '@/stores/organizationStore';

export type ActiveBulkDialog =
  | null | 'move_stage' | 'assign' | 'reject' | 'hire'
  | 'send_email' | 'send_form' | 'rescore' | 'add_tags' | 'remove_tags' | 'export_csv' | 'delete';

interface BaseProps {
  open: boolean;
  N: number;
  loading: boolean;
  onClose: () => void;
}

export function ConfirmBulkDialog({
  open, title, description, actionLabel, onClose, onConfirm, loading, destructive,
}: {
  open: boolean; title: string; description: string; actionLabel: string;
  onClose: () => void; onConfirm: () => void; loading: boolean; destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={loading}>
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoveStageDialog({
  open, N, onClose, onConfirm, loading,
}: BaseProps & { onConfirm: (stageId: string) => void }) {
  const { data: pipeline } = useApplicantPipeline();
  const [stageId, setStageId] = useState<string>('');
  const stages = (pipeline?.stages ?? []) as PipelineStage[];
  useEffect(() => { if (!open) setStageId(''); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Flytt {N} søkere?</DialogTitle>
          <DialogDescription>Velg hvilket stadium de skal flyttes til.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="mb-1.5 block">Stadium</Label>
          <Select value={stageId} onValueChange={setStageId}>
            <SelectTrigger><SelectValue placeholder="Velg stadium..." /></SelectTrigger>
            <SelectContent>
              {stages.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button onClick={() => onConfirm(stageId)} disabled={!stageId || loading}>Flytt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AssignBulkDialog({
  open, N, onClose, onConfirm, loading,
}: BaseProps & { onConfirm: (assigneeId: string | null) => void }) {
  const { data: team } = useTeamMembers();
  const [assigneeId, setAssigneeId] = useState<string>('');
  useEffect(() => { if (!open) setAssigneeId(''); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tilordne {N} søkere?</DialogTitle>
          <DialogDescription>Velg teammedlem som skal eie disse søkerne.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="mb-1.5 block">Tildel til</Label>
          <Select value={assigneeId} onValueChange={setAssigneeId}>
            <SelectTrigger><SelectValue placeholder="Velg medlem..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Ingen (fjern tilordning)</SelectItem>
              {(team ?? []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button onClick={() => onConfirm(assigneeId === '__none__' ? null : assigneeId)}
            disabled={!assigneeId || loading}>Tilordne</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectBulkDialog({
  open, N, onClose, onConfirm, loading,
}: BaseProps & { onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (!open) setReason(''); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avvise {N} søkere?</DialogTitle>
          <DialogDescription>
            Søkerne flyttes til Diskvalifisert. Begrunnelsen er valgfri og lagres i revisjon.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Label className="mb-1.5 block">Begrunnelse (valgfritt)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button variant="destructive" onClick={() => onConfirm(reason.trim())} disabled={loading}>
            Avvis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SendEmailBulkDialog({
  open, N, onClose, onConfirm, loading,
}: BaseProps & { onConfirm: (templateId: string, inboxId: string) => void }) {
  const { currentOrganizationId } = useOrganizationStore();
  const [templateId, setTemplateId] = useState<string>('');
  const [inboxId, setInboxId] = useState<string>('');
  useEffect(() => { if (!open) { setTemplateId(''); setInboxId(''); } }, [open]);
  const { data: templates } = useQuery({
    queryKey: ['recruitment-email-templates-active', currentOrganizationId],
    enabled: !!currentOrganizationId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recruitment_email_templates')
        .select('id, name, subject')
        .eq('organization_id', currentOrganizationId!)
        .eq('is_active', true)
        .is('soft_deleted_at', null)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: inboxes } = useQuery({
    queryKey: ['recruitment-inboxes-bulk', currentOrganizationId],
    enabled: !!currentOrganizationId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name, is_default')
        .eq('organization_id', currentOrganizationId!)
        .eq('is_active', true)
        .eq('purpose', 'recruitment')
        .order('is_default', { ascending: false })
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    if (open && !inboxId && inboxes && inboxes.length > 0) setInboxId(inboxes[0].id);
  }, [open, inboxes, inboxId]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send e-post til {N} søkere?</DialogTitle>
          <DialogDescription>
            Velg innboks og mal. Søkere uten samtykke (GDPR) hoppes over automatisk.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-3">
          <div>
            <Label className="mb-1.5 block">Rekrutterings-innboks</Label>
            <Select value={inboxId} onValueChange={setInboxId}>
              <SelectTrigger><SelectValue placeholder="Velg innboks..." /></SelectTrigger>
              <SelectContent>
                {(inboxes ?? []).map((i: any) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(inboxes?.length ?? 0) === 0 && (
              <p className="text-xs text-destructive mt-1">
                Ingen rekrutterings-innboks. Opprett én i Admin → Innbokser.
              </p>
            )}
          </div>
          <div>
            <Label className="mb-1.5 block">E-postmal</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Velg mal..." /></SelectTrigger>
              <SelectContent>
                {(templates ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button onClick={() => onConfirm(templateId, inboxId)} disabled={!templateId || !inboxId || loading}>
            Send e-post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TagsBulkDialog({
  open, mode, N, onClose, onConfirm, loading,
}: BaseProps & {
  mode: 'add' | 'remove';
  onConfirm: (tagIds: string[]) => void;
}) {
  const [tagIds, setTagIds] = useState<string[]>([]);
  useEffect(() => { if (!open) setTagIds([]); }, [open]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'remove' ? 'Fjern etiketter' : 'Legg til etiketter'} på {N} søkere?
          </DialogTitle>
          <DialogDescription>Velg én eller flere etiketter.</DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <TagPicker value={tagIds} onChange={setTagIds} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button onClick={() => onConfirm(tagIds)} disabled={tagIds.length === 0 || loading}>
            {mode === 'remove' ? 'Fjern' : 'Legg til'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteBulkDialog({
  open, N, onClose, onConfirm, loading,
}: BaseProps & { onConfirm: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  useEffect(() => { if (!open) setConfirmText(''); }, [open]);
  const ok = confirmText === 'SLETT';
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slette {N} søkere permanent?</DialogTitle>
          <DialogDescription>
            Denne handlingen kan ikke angres. Skriv «SLETT» for å bekrefte.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="SLETT" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!ok || loading}>
            Slett permanent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SendFormBulkDialog({
  open, N, onClose, onConfirm, loading,
}: BaseProps & {
  onConfirm: (payload: { channel: 'email' | 'sms'; inbox_id: string; expiry_days: number; custom_message?: string }) => void;
}) {
  const { currentOrganizationId } = useOrganizationStore();
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [inboxId, setInboxId] = useState<string>('');
  const [expiryDays, setExpiryDays] = useState(7);
  const [customMessage, setCustomMessage] = useState('');
  useEffect(() => {
    if (!open) { setInboxId(''); setExpiryDays(7); setCustomMessage(''); setChannel('email'); }
  }, [open]);
  const { data: inboxes } = useQuery({
    queryKey: ['recruitment-inboxes-bulk-form', currentOrganizationId, channel],
    enabled: !!currentOrganizationId && open,
    queryFn: async () => {
      let q = supabase.from('inboxes').select('id, name, sms_enabled')
        .eq('organization_id', currentOrganizationId!).eq('is_active', true).eq('purpose', 'recruitment');
      if (channel === 'sms') q = q.eq('sms_enabled', true);
      const { data, error } = await q.order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
  useEffect(() => {
    if (open && inboxes && inboxes.length > 0 && !inboxes.find((i: any) => i.id === inboxId)) {
      setInboxId(inboxes[0].id);
    }
  }, [open, inboxes, inboxId]);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send kandidatskjema til {N} søkere?</DialogTitle>
          <DialogDescription>
            Hver søker får en personlig lenke. Søkere uten kontaktinfo for valgt kanal hoppes over.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="mb-1.5 block">Kanal</Label>
            <RadioGroup value={channel} onValueChange={(v) => setChannel(v as any)} className="flex gap-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="email" /> E-post</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="sms" /> SMS</label>
            </RadioGroup>
          </div>
          <div>
            <Label className="mb-1.5 block">Innboks</Label>
            <Select value={inboxId} onValueChange={setInboxId}>
              <SelectTrigger><SelectValue placeholder="Velg innboks..." /></SelectTrigger>
              <SelectContent>
                {(inboxes ?? []).map((i: any) => (<SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>))}
              </SelectContent>
            </Select>
            {(inboxes?.length ?? 0) === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {channel === 'sms' ? 'Ingen innboks med SMS aktivert.' : 'Ingen rekrutterings-innboks.'}
              </p>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Gyldighet</Label>
              <span className="text-xs text-muted-foreground">{expiryDays} dag{expiryDays === 1 ? '' : 'er'}</span>
            </div>
            <Slider value={[expiryDays]} onValueChange={(v) => setExpiryDays(v[0])} min={1} max={14} step={1} />
          </div>
          <div>
            <Label className="mb-1.5 block">Egen melding (valgfritt)</Label>
            <Textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} rows={2} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button
            onClick={() => onConfirm({ channel, inbox_id: inboxId, expiry_days: expiryDays, custom_message: customMessage.trim() || undefined })}
            disabled={!inboxId || loading}
          >
            Send skjema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
