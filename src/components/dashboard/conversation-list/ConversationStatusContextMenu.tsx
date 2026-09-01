import React, { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Clock, XCircle, MessageCircle, UserPlus, UserMinus, Check, Tag } from 'lucide-react';
import { useConversationStatusActions } from '@/hooks/useConversationStatusActions';
import { useConversationAssignActions } from '@/hooks/useConversationAssignActions';
import { type TeamMember } from '@/hooks/useTeamMembers';
import { useConversationBrandActions } from '@/hooks/useConversationBrandActions';
import { BrandMenuOptions } from '@/components/brands/BrandMenuOptions';
import { MemberOptionContent, memberLabel, useMemberSearch } from '@/components/shared/MemberPicker';
import { TagContextMenuItems } from '@/components/tags/TagContextMenuItems';

interface ConversationStatusContextMenuProps {
  conversationId: string;
  status?: string;
  /** Currently assigned profile id, used to show a checkmark. */
  assignedToId?: string | null;
  /** Current brand label (from conversation metadata), used to show a checkmark. */
  brandLabel?: string | null;
  children: React.ReactNode;
}

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
  const [search, setSearch] = useState('');
  const { recent, rest } = useMemberSearch(search, { withRecent: true });

  const renderMember = (member: TeamMember) => (
    <ContextMenuItem
      key={member.id}
      onSelect={() => assign(conversationId, member.id, memberLabel(member))}
      className="gap-2"
    >
      <MemberOptionContent member={member} />
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
          <ContextMenuSubContent className="w-60 max-h-80 overflow-y-auto p-1">
            <BrandMenuOptions
              currentLabel={brandLabel}
              onSelect={(brandName) => setBrand(conversationId, brandName)}
              Item={ContextMenuItem}
              Separator={ContextMenuSeparator}
            />
          </ContextMenuSubContent>

        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuLabel className="text-xs text-muted-foreground">Tags</ContextMenuLabel>
        <TagContextMenuItems entityType="conversation" entityId={conversationId} />
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
