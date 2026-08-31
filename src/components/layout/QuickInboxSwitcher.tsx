/**
 * QuickInboxSwitcher - Cmd/Ctrl+D dialog for jumping between inboxes.
 * Each inbox is numbered; pressing the number key switches to it instantly.
 */
import React from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { useAccessibleInboxes } from '@/hooks/useInteractionsData';
import { useInboxEmailAddresses } from '@/hooks/useInboxEmailAddresses';
import { useInboxOutstandingCounts } from '@/hooks/useInboxOutstandingCounts';
import { useDefaultInbox } from '@/hooks/useDefaultInbox';

interface QuickInboxSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickInboxSwitcher: React.FC<QuickInboxSwitcherProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { data: inboxes = [] } = useAccessibleInboxes();
  const { data: inboxEmails = {} } = useInboxEmailAddresses();
  const { data: outstanding = {} } = useInboxOutstandingCounts();
  const { defaultInboxId } = useDefaultInbox();

  // Only configured inboxes are selectable
  const selectable = React.useMemo(
    () => inboxes.filter((i) => !!inboxEmails[i.id]),
    [inboxes, inboxEmails],
  );

  const allOutstanding = React.useMemo(
    () =>
      Object.values(outstanding).reduce(
        (acc, o) => ({ open: acc.open + o.open, pending: acc.pending + o.pending }),
        { open: 0, pending: 0 },
      ),
    [outstanding],
  );

  const goToInbox = React.useCallback(
    (inboxId: string) => {
      const onInteractions = location.pathname.startsWith('/interactions/text');
      const basePath = onInteractions ? location.pathname : '/interactions/text/open';
      const params = new URLSearchParams(onInteractions ? searchParams : undefined);
      if (inboxId === 'all') params.delete('inbox');
      else params.set('inbox', inboxId);
      const qs = params.toString();
      navigate(qs ? `${basePath}?${qs}` : basePath);
      onOpenChange(false);
    },
    [location.pathname, searchParams, navigate, onOpenChange],
  );

  // Number keys select the matching entry (0 = All Inboxes)
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!/^[0-9]$/.test(e.key)) return;
      const n = Number(e.key);
      if (n === 0) {
        e.preventDefault();
        goToInbox('all');
        return;
      }
      const inbox = selectable[n - 1];
      if (inbox) {
        e.preventDefault();
        goToInbox(inbox.id);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, selectable, goToInbox]);

  const NumberKey: React.FC<{ n: number }> = ({ n }) => (
    <kbd className="flex h-5 w-5 items-center justify-center rounded border border-border bg-muted text-[11px] font-medium text-muted-foreground">
      {n}
    </kbd>
  );

  const Counts: React.FC<{ open: number; pending: number }> = ({ open: o, pending }) => (
    <span className="ml-auto flex items-center gap-1">
      {o > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]" title={`${o} open`}>
          {o}
        </Badge>
      )}
      {pending > 0 && (
        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[10px] text-orange-600 border-orange-500/40"
          title={`${pending} pending`}
        >
          {pending}
        </Badge>
      )}
    </span>
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Switch inbox… (press a number)" />
      <CommandList>
        <CommandEmpty>No inboxes found.</CommandEmpty>
        <CommandGroup heading="Inboxes">
          <CommandItem value="All Inboxes" onSelect={() => goToInbox('all')} className="gap-2">
            <NumberKey n={0} />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
            <span>All Inboxes</span>
            <Counts open={allOutstanding.open} pending={allOutstanding.pending} />
          </CommandItem>

          {selectable.map((inbox, idx) => (
            <CommandItem
              key={inbox.id}
              value={`${inbox.name} ${inboxEmails[inbox.id] ?? ''}`}
              onSelect={() => goToInbox(inbox.id)}
              className="gap-2"
            >
              {idx < 9 ? <NumberKey n={idx + 1} /> : <span className="w-5" />}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: inbox.color || '#6B7280' }}
              />
              <div className="min-w-0 flex flex-col leading-tight">
                <span className="truncate flex items-center gap-1.5">
                  {inbox.name}
                  {defaultInboxId === inbox.id && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[9px] border-primary/40 text-primary">
                      Default
                    </Badge>
                  )}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {inboxEmails[inbox.id]}
                </span>
              </div>
              <Counts
                open={outstanding[inbox.id]?.open || 0}
                pending={outstanding[inbox.id]?.pending || 0}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
