import React, { useMemo, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Clock, XCircle, MessageCircle, UserPlus, UserMinus, Check, Tag, Ban } from 'lucide-react';
import { useConversationStatusActions } from '@/hooks/useConversationStatusActions';
import { useConversationAssignActions, getRecentAssigneeIds } from '@/hooks/useConversationAssignActions';
import { useTeamMembers, type TeamMember } from '@/hooks/useTeamMembers';
import { useConversationBrandActions } from '@/hooks/useConversationBrandActions';
import { useNoddiBrands } from '@/hooks/useNoddiBrands';
import { getBrandColor } from '@/lib/conversationBrand';

interface ConversationStatusContextMenuProps {
  conversationId: string;
  status?: string;
  /** Currently assigned profile id, used to show a checkmark. */
  assignedToId?: string | null;
  /** Current brand label (from conversation metadata), used to show a checkmark. */
  brandLabel?: string | null;
  children: React.ReactNode;
}

const initials = (member: TeamMember) =>
  (member.full_name || member.email || '?').trim().charAt(0).toUpperCase();

/**
 * Right-click menu giving agents one-click "Pending" / "Close" / "Reopen"
 * plus quick assign (searchable, with recently used owners on top).
 */
export const ConversationStatusContextMenu: React.FC<ConversationStatusContextMenuProps> = ({
  conversationId,
  status,
  assignedToId,
  brandLabel,
  children,
}) => {
  const { setStatus } = useConversationStatusActions();
  const { assign } = useConversationAssignActions();
  const { setBrand } = useConversationBrandActions();
  const { brands, findBrand } = useNoddiBrands();
  const { data: members = [] } = useTeamMembers();
  const [search, setSearch] = useState('');
  const currentBrandSlug = findBrand(brandLabel)?.slug ?? null;

  const { recent, rest } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = members.filter(
      (m) =>
        !q ||
        (m.full_name || '').toLowerCase().includes(q) ||
        (m.email || '').toLowerCase().includes(q),
    );
    const recentIds = getRecentAssigneeIds();
    const recentMembers = recentIds
      .map((id) => matches.find((m) => m.id === id))
      .filter((m): m is TeamMember => Boolean(m));
    const recentSet = new Set(recentMembers.map((m) => m.id));
    return { recent: recentMembers, rest: matches.filter((m) => !recentSet.has(m.id)) };
  }, [members, search]);

  const renderMember = (member: TeamMember) => (
    <ContextMenuItem
      key={member.id}
      onSelect={() => assign(conversationId, member.id, member.full_name || member.email)}
      className="gap-2"
    >
      <Avatar className="h-5 w-5">
        <AvatarImage src={member.avatar_url || undefined} />
        <AvatarFallback className="text-[10px]">{initials(member)}</AvatarFallback>
      </Avatar>
      <span className="truncate flex-1">{member.full_name || member.email}</span>
      {assignedToId === member.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
    </ContextMenuItem>
  );

  return (
    <ContextMenu onOpenChange={(open) => !open && setSearch('')}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuLabel className="text-xs text-muted-foreground">Assign</ContextMenuLabel>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <UserPlus className="w-4 h-4 mr-2" />
            Assign to…
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64 p-0">
            <div className="p-2">
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search people…"
                className="h-8 text-sm"
              />
            </div>
            <div className="max-h-64 overflow-y-auto pb-1">
              {recent.length > 0 && (
                <>
                  <ContextMenuLabel className="text-xs text-muted-foreground">Recent</ContextMenuLabel>
                  {recent.map(renderMember)}
                  {rest.length > 0 && <ContextMenuSeparator />}
                </>
              )}
              {rest.map(renderMember)}
              {recent.length === 0 && rest.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">No people found</div>
              )}
            </div>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => assign(conversationId, null)}>
              <UserMinus className="w-4 h-4 mr-2" />
              Unassign
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuLabel className="text-xs text-muted-foreground">Brand</ContextMenuLabel>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Tag className="w-4 h-4 mr-2" />
            Set brand…
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56 max-h-72 overflow-y-auto">
            {brands.length === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">No brands available</div>
            )}
            {brands.map((b) => {
              const color = getBrandColor(b.slug);
              return (
                <ContextMenuItem key={b.id} className="gap-2" onSelect={() => setBrand(conversationId, b.name)}>
                  {b.logo_url ? (
                    <img src={b.logo_url} alt="" loading="lazy" className="h-4 w-4 rounded-sm object-contain shrink-0" />
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  )}
                  <span className="truncate flex-1" style={{ color }}>{b.name}</span>
                  {currentBrandSlug === b.slug && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </ContextMenuItem>
              );
            })}
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => setBrand(conversationId, null)}>
              <Ban className="w-4 h-4 mr-2" />
              Clear brand
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuLabel className="text-xs text-muted-foreground">Change status</ContextMenuLabel>
        <ContextMenuItem
          disabled={status === 'pending'}
          onSelect={() => setStatus(conversationId, 'pending')}
        >
          <Clock className="w-4 h-4 mr-2" />
          Set to pending
        </ContextMenuItem>
        <ContextMenuItem
          disabled={status === 'closed'}
          onSelect={() => setStatus(conversationId, 'closed')}
        >
          <XCircle className="w-4 h-4 mr-2" />
          Close conversation
        </ContextMenuItem>
        <ContextMenuItem
          disabled={status === 'open'}
          onSelect={() => setStatus(conversationId, 'open')}
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Reopen
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
