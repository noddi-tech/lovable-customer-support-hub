import React, { useMemo } from 'react';
import { Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TagPickerList } from '@/components/tags/TagPicker';
import { useTags } from '@/hooks/useTags';
import { useEntityTags, type TaggableEntity } from '@/hooks/useEntityTags';
import { toast } from 'sonner';

interface BulkTagMenuProps {
  entityType: TaggableEntity;
  entityIds: string[];
  className?: string;
  size?: 'sm' | 'default';
}

/**
 * Applies or removes a tag across every selected row.
 *
 * A tag shown as checked is present on all selected rows; toggling it removes
 * it everywhere, otherwise it is added to the rows that are missing it.
 */
export const BulkTagMenu: React.FC<BulkTagMenuProps> = ({
  entityType,
  entityIds,
  className,
  size = 'sm',
}) => {
  const { getTags, addTag, removeTag } = useEntityTags(entityType);
  const { createTag } = useTags();

  const commonTagIds = useMemo(() => {
    if (entityIds.length === 0) return [];
    const counts = new Map<string, number>();
    entityIds.forEach((id) => {
      getTags(id).forEach((t) => counts.set(t.id, (counts.get(t.id) ?? 0) + 1));
    });
    return [...counts.entries()]
      .filter(([, n]) => n === entityIds.length)
      .map(([tagId]) => tagId);
  }, [entityIds, getTags]);

  const applyTag = async (tagId: string) => {
    const isCommon = commonTagIds.includes(tagId);
    await Promise.all(
      entityIds.map((id) => {
        const has = getTags(id).some((t) => t.id === tagId);
        if (isCommon) return removeTag(id, tagId);
        return has ? Promise.resolve() : addTag(id, tagId);
      }),
    );
    toast.success(
      isCommon
        ? `Tag removed from ${entityIds.length} item${entityIds.length === 1 ? '' : 's'}`
        : `Tag added to ${entityIds.length} item${entityIds.length === 1 ? '' : 's'}`,
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size} className={className}>
          <TagIcon className="mr-1.5 h-3.5 w-3.5" />
          Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <TagPickerList
          selectedIds={commonTagIds}
          onToggle={applyTag}
          onCreate={async (name, color) => {
            const tag = await createTag.mutateAsync({ name, color });
            await Promise.all(entityIds.map((id) => addTag(id, tag.id)));
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
