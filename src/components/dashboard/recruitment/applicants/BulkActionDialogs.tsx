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
import { useApplicantPipeline, type PipelineStage } from './useApplicants';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { TagPicker } from './TagPicker';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useOrganizationStore } from '@/stores/organizationStore';

export type ActiveBulkDialog =
  | null | 'move_stage' | 'assign' | 'reject' | 'hire'
  | 'send_email' | 'add_tags' | 'remove_tags' | 'export_csv' | 'delete';

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
}: BaseProps & { onConfirm: (templateId: string) => void }) {
  const { currentOrganizationId } = useOrganizationStore();
  const [templateId, setTemplateId] = useState<string>('');
  useEffect(() => { if (!open) setTemplateId(''); }, [open]);
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
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send e-post til {N} søkere?</DialogTitle>
          <DialogDescription>
            Velg mal. Søkere uten samtykke (GDPR) hoppes over automatisk.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button onClick={() => onConfirm(templateId)} disabled={!templateId || loading}>
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
