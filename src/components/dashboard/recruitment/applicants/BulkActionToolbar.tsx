import {
  X, ChevronDown, Move, UserPlus, XCircle, CheckCircle, Mail,
  Tag as TagIcon, Download, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermissions } from '@/hooks/usePermissions';
import type { ActiveBulkDialog } from './BulkActionDialogs';

interface Props {
  selectedIds: string[];
  onClear: () => void;
  onOpenAction: (action: Exclude<ActiveBulkDialog, null>) => void;
}

/**
 * Presentation-only bulk action toolbar.
 *
 * Dialogs are mounted at page level (RecruitmentApplicants.tsx) and controlled
 * via `onOpenAction`. Both dropdowns are non-modal (`modal={false}`) and items
 * defer dialog open to the next tick so Radix has time to release focus locks
 * before another modal takes over. Without this, the dropdown -> dialog
 * transition can leave `body { pointer-events: none }` stuck and freeze the page.
 */
export function BulkActionToolbar({ selectedIds, onClear, onOpenAction }: Props) {
  const perms = usePermissions() as any;
  const isAdmin = !!(perms?.isAdmin || perms?.isOrganizationAdmin || perms?.canManageOrganization);
  const N = selectedIds.length;

  // Defer dialog open until after the dropdown finishes closing/animating.
  // setTimeout(0) is enough — the goal is to land on the next tick so Radix
  // can fully release the dropdown's focus/aria-hidden/body-lock state before
  // the dialog mounts its own focus trap and overlay.
  const openDeferred = (action: Exclude<ActiveBulkDialog, null>) => {
    setTimeout(() => onOpenAction(action), 0);
  };

  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 flex-wrap p-2 px-3 border rounded-md bg-card shadow-sm">
      <span className="text-sm font-medium">{N} valgt</span>
      <button
        type="button"
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <X className="h-3 w-3" /> Avmark alle
      </button>
      <div className="flex-1" />

      <div className="hidden md:flex items-center gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => onOpenAction('move_stage')}>
          <Move className="h-3.5 w-3.5" /> Flytt til
        </Button>
        <Button size="sm" variant="outline" onClick={() => onOpenAction('assign')}>
          <UserPlus className="h-3.5 w-3.5" /> Tilordne
        </Button>
        <Button size="sm" variant="outline" onClick={() => onOpenAction('reject')}>
          <XCircle className="h-3.5 w-3.5" /> Avvis
        </Button>
        <Button size="sm" onClick={() => onOpenAction('hire')}>
          <CheckCircle className="h-3.5 w-3.5" /> Ansatt
        </Button>
        <Button size="sm" variant="outline" onClick={() => onOpenAction('send_email')}>
          <Mail className="h-3.5 w-3.5" /> Send e-post
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <TagIcon className="h-3.5 w-3.5" /> Etiketter <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openDeferred('add_tags')}>
              Legg til etiketter
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('remove_tags')}>
              Fjern etiketter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="outline" onClick={() => onOpenAction('export_csv')}>
          <Download className="h-3.5 w-3.5" /> Eksporter CSV
        </Button>
        {isAdmin && (
          <Button size="sm" variant="destructive" onClick={() => onOpenAction('delete')}>
            <Trash2 className="h-3.5 w-3.5" /> Slett permanent
          </Button>
        )}
      </div>

      <div className="md:hidden">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="sm">Handlinger <ChevronDown className="h-3 w-3" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openDeferred('move_stage')}>Flytt til</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('assign')}>Tilordne</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('reject')}>Avvis</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('hire')}>Ansatt</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('send_email')}>Send e-post</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('add_tags')}>Legg til etiketter</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('remove_tags')}>Fjern etiketter</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDeferred('export_csv')}>Eksporter CSV</DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => openDeferred('delete')}
                  className="text-destructive"
                >
                  Slett permanent
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default BulkActionToolbar;
