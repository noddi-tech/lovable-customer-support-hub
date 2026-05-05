import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, ChevronDown, Move, UserPlus, XCircle, CheckCircle, Mail,
  Tag as TagIcon, Download, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { usePermissions } from '@/hooks/usePermissions';
import { useBulkApplicantAction, type BulkAction } from '@/hooks/recruitment/useBulkApplicantAction';
import { TagPicker } from './TagPicker';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useOrganizationStore } from '@/stores/organizationStore';

interface Props {
  selectedIds: string[];
  onClear: () => void;
}

type ActiveDialog =
  | null | 'move_stage' | 'assign' | 'reject' | 'hire'
  | 'send_email' | 'add_tags' | 'remove_tags' | 'export_csv' | 'delete';

export function BulkActionToolbar({ selectedIds, onClear }: Props) {
  const [active, setActive] = useState<ActiveDialog>(null);
  const perms = usePermissions() as any;
  const isAdmin = !!(perms?.isAdmin || perms?.isOrganizationAdmin || perms?.canManageOrganization);
  const bulkMut = useBulkApplicantAction();
  const N = selectedIds.length;

  const run = async (action: BulkAction, payload?: any) => {
    try {
      await bulkMut.mutateAsync({ applicant_ids: selectedIds, action, payload });
      setActive(null);
      onClear();
    } catch { /* toast handled */ }
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 flex-wrap p-2 px-3 border rounded-md bg-card shadow-sm">
      <span className="text-sm font-medium">{N} valgt</span>
      <button type="button" onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
        <X className="h-3 w-3" /> Avmark alle
      </button>
      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => setActive('move_stage')}>
          <Move className="h-3.5 w-3.5" /> Flytt til
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActive('assign')}>
          <UserPlus className="h-3.5 w-3.5" /> Tilordne
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActive('reject')}>
          <XCircle className="h-3.5 w-3.5" /> Avvis
        </Button>
        <Button size="sm" onClick={() => setActive('hire')}>
          <CheckCircle className="h-3.5 w-3.5" /> Ansatt
        </Button>
        <Button size="sm" variant="outline" onClick={() => setActive('send_email')}>
          <Mail className="h-3.5 w-3.5" /> Send e-post
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <TagIcon className="h-3.5 w-3.5" /> Etiketter <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActive('add_tags')}>Legg til etiketter</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('remove_tags')}>Fjern etiketter</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={() => setActive('export_csv')}>
          <Download className="h-3.5 w-3.5" /> Eksporter CSV
        </Button>
        {isAdmin && (
          <Button size="sm" variant="destructive" onClick={() => setActive('delete')}>
            <Trash2 className="h-3.5 w-3.5" /> Slett permanent
          </Button>
        )}
      </div>

      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">Handlinger <ChevronDown className="h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActive('move_stage')}>Flytt til</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('assign')}>Tilordne</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('reject')}>Avvis</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('hire')}>Ansatt</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('send_email')}>Send e-post</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('add_tags')}>Legg til etiketter</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('remove_tags')}>Fjern etiketter</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActive('export_csv')}>Eksporter CSV</DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActive('delete')} className="text-destructive">
                  Slett permanent
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <MoveStageDialog open={active === 'move_stage'} N={N}
        onClose={() => setActive(null)} loading={bulkMut.isPending}
        onConfirm={(stage_id: string) => run('move_stage', { stage_id })} />
      <AssignDialog open={active === 'assign'} N={N}
        onClose={() => setActive(null)} loading={bulkMut.isPending}
        onConfirm={(assignee_id: string | null) => run('assign', { assignee_id })} />
      <RejectDialog open={active === 'reject'} N={N}
        onClose={() => setActive(null)} loading={bulkMut.isPending}
        onConfirm={(reason: string) => run('reject', reason ? { reason } : {})} />
      <ConfirmDialog open={active === 'hire'}
        title={`Ansette ${N} søkere?`}
        description="Søkerne flyttes til Ansatt-stadiet."
        actionLabel="Ansett"
        onClose={() => setActive(null)}
        onConfirm={() => run('hire')} loading={bulkMut.isPending} />
      <SendEmailDialog open={active === 'send_email'} N={N}
        onClose={() => setActive(null)} loading={bulkMut.isPending}
        onConfirm={(template_id: string) => run('send_email', { template_id })} />
      <TagsBulkDialog open={active === 'add_tags' || active === 'remove_tags'}
        mode={active === 'remove_tags' ? 'remove' : 'add'} N={N}
        onClose={() => setActive(null)} loading={bulkMut.isPending}
        onConfirm={(tag_ids: string[]) =>
          run(active === 'remove_tags' ? 'remove_tags' : 'add_tags', { tag_ids })} />
      <ConfirmDialog open={active === 'export_csv'}
        title={`Eksportere ${N} søkere?`}
        description="Du får en CSV-fil med søker-info som lastes ned automatisk."
        actionLabel="Eksporter"
        onClose={() => setActive(null)}
        onConfirm={() => run('export_csv')} loading={bulkMut.isPending} />
      <DeleteDialog open={active === 'delete'} N={N}
        onClose={() => setActive(null)} loading={bulkMut.isPending}
        onConfirm={() => run('delete')} />
    </div>
  );
}

function ConfirmDialog({ open, title, description, actionLabel, onClose, onConfirm, loading }: any) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Avbryt</Button>
          <Button onClick={onConfirm} disabled={loading}>{actionLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveStageDialog({ open, N, onClose, onConfirm, loading }: any) {
  const { data: pipeline } = useApplicantPipeline();
  const [stageId, setStageId] = useState<string>('');
  const stages = (pipeline?.stages ?? []) as PipelineStage[];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
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

function AssignDialog({ open, N, onClose, onConfirm, loading }: any) {
  const { data: team } = useTeamMembers();
  const [assigneeId, setAssigneeId] = useState<string>('');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
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

function RejectDialog({ open, N, onClose, onConfirm, loading }: any) {
  const [reason, setReason] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
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

function SendEmailDialog({ open, N, onClose, onConfirm, loading }: any) {
  const { currentOrganizationId } = useOrganizationStore();
  const [templateId, setTemplateId] = useState<string>('');
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
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
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

function TagsBulkDialog({ open, mode, N, onClose, onConfirm, loading }: any) {
  const [tagIds, setTagIds] = useState<string[]>([]);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
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

function DeleteDialog({ open, N, onClose, onConfirm, loading }: any) {
  const [confirmText, setConfirmText] = useState('');
  const ok = confirmText === 'SLETT';
  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o && !loading) { setConfirmText(''); onClose(); }
    }}>
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

export default BulkActionToolbar;
