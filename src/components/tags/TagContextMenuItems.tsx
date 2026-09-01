import React from 'react';
import { Tag as TagIcon, Check } from 'lucide-react';
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { useEntityTags, type TaggableEntity } from '@/hooks/useEntityTags';
import { TagBadge } from '@/components/tags/TagBadge';
import { cn } from '@/lib/utils';

interface TagContextMenuItemsProps {
  entityType: TaggableEntity;
  entityId: string;
}

/**
 * "Tags" submenu shared by every right-click list menu (conversations, live
 * chats, calls, cases and customers).
 */
export const TagContextMenuItems: React.FC<TagContextMenuItemsProps> = ({ entityType, entityId }) => {
  const { tags, getTags, toggleTag } = useEntityTags(entityType);
  const assigned = getTags(entityId);
  const assignedIds = new Set(assigned.map((t) => t.id));

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="gap-2">
        <TagIcon className="h-4 w-4" />
        Tags
        {assigned.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{assigned.length}</span>
        )}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="max-h-72 overflow-y-auto bg-popover z-50 w-56">
        {tags.length === 0 && (
          <ContextMenuItem disabled>No tags yet — create one in Settings</ContextMenuItem>
        )}
        {tags.map((tag) => (
          <ContextMenuItem
            key={tag.id}
            onSelect={(e) => {
              e.preventDefault();
              void toggleTag(entityId, tag.id);
            }}
            className="gap-2"
          >
            <Check className={cn('h-3.5 w-3.5 shrink-0', assignedIds.has(tag.id) ? 'opacity-100' : 'opacity-0')} />
            <TagBadge tag={tag} />
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
};
