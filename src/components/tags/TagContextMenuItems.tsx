import React from 'react';
import { Tag as TagIcon } from 'lucide-react';
import {
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import { useEntityTags, type TaggableEntity } from '@/hooks/useEntityTags';
import { useTags } from '@/hooks/useTags';
import { TagPickerList } from '@/components/tags/TagPicker';

interface TagContextMenuItemsProps {
  entityType: TaggableEntity;
  entityId: string;
}

/**
 * "Tags" submenu shared by every right-click list menu (conversations, live
 * chats, calls, cases and customers).
 */
export const TagContextMenuItems: React.FC<TagContextMenuItemsProps> = ({ entityType, entityId }) => {
  const { getTags, toggleTag, addTag } = useEntityTags(entityType);
  const { createTag } = useTags();
  const assigned = getTags(entityId);

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger className="gap-2">
        <TagIcon className="h-4 w-4" />
        Tags
        {assigned.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{assigned.length}</span>
        )}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent className="p-0 bg-popover z-50 w-auto">
        {/* Same searchable list (with inline tag creation) as the detail-view picker */}
        <TagPickerList
          selectedIds={assigned.map((t) => t.id)}
          onToggle={(tagId) => void toggleTag(entityId, tagId)}
          onCreate={async (name, color) => {
            const tag = await createTag.mutateAsync({ name, color });
            await addTag(entityId, tag.id);
          }}
        />
      </ContextMenuSubContent>
    </ContextMenuSub>
  );
};
