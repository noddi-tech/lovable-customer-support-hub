import React, { useMemo, useState } from 'react';
import { UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamMembers } from '@/hooks/useTeamMembers';

interface BulkAssignMenuProps {
  onAssign: (memberId: string | null) => void | Promise<void>;
  className?: string;
  size?: 'sm' | 'default';
  label?: string;
}

/** Searchable team-member picker used by bulk actions bars. */
export const BulkAssignMenu: React.FC<BulkAssignMenuProps> = ({
  onAssign,
  className,
  size = 'sm',
  label = 'Assign',
}) => {
  const { data: members = [] } = useTeamMembers();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q),
    );
  }, [members, search]);

  const pick = async (id: string | null) => {
    setOpen(false);
    setSearch('');
    await onAssign(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size} className={className}>
          <UserPlus className="mr-1.5 h-3.5 w-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-0">
        <div className="p-2">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people…"
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="max-h-60 overflow-y-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => pick(null)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
          >
            <UserMinus className="h-4 w-4 text-muted-foreground" />
            Unassign
          </button>
          {filtered.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m.id)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={m.avatar_url} />
                <AvatarFallback className="text-[10px]">
                  {(m.full_name || m.email || '?').trim().charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate">{m.full_name || m.email}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">No people found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
