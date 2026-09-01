import React, { useMemo, useState } from 'react';
import { Check, Plus, Search, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTags, TAG_COLORS, type Tag } from '@/hooks/useTags';
import { useEntityTags, type TaggableEntity } from '@/hooks/useEntityTags';
import { TagBadge } from '@/components/tags/TagBadge';
import { cn } from '@/lib/utils';

interface TagPickerListProps {
  selectedIds: string[];
  onToggle: (tagId: string) => void;
  onCreate?: (name: string, color: string) => Promise<void> | void;
}

/** Searchable multi-select tag list with inline creation. */
export const TagPickerList: React.FC<TagPickerListProps> = ({ selectedIds, onToggle, onCreate }) => {
  const { tags } = useTags();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [color, setColor] = useState(TAG_COLORS[0]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(needle));
  }, [tags, search]);

  const exactExists = tags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());

  const handleCreate = async () => {
    const name = search.trim();
    if (!name || !onCreate) return;
    setCreating(true);
    try {
      await onCreate(name, color);
      setSearch('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-64" onKeyDown={(e) => e.stopPropagation()}>
      <div className="relative p-2">
        <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search or create tag…"
          className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-2 text-sm outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="max-h-60 overflow-y-auto px-1 pb-1">
        {filtered.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onToggle(tag.id)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
            >
              <Check className={cn('h-3.5 w-3.5 shrink-0', selected ? 'opacity-100' : 'opacity-0')} />
              <TagBadge tag={tag} />
            </button>
          );
        })}
        {filtered.length === 0 && !search.trim() && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No tags yet.</p>
        )}
      </div>

      {onCreate && search.trim() && !exactExists && (
        <div className="border-t p-2 space-y-2">
          <div className="flex flex-wrap gap-1">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  'h-4 w-4 rounded-full border',
                  color === c ? 'ring-2 ring-offset-1 ring-ring' : '',
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button size="sm" className="w-full" disabled={creating} onClick={handleCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Create "{search.trim()}"
          </Button>
        </div>
      )}
    </div>
  );
};

interface EntityTagPickerProps {
  entityType: TaggableEntity;
  entityId: string;
  /** Render the currently assigned tags next to the trigger. */
  showBadges?: boolean;
  className?: string;
  buttonLabel?: string;
}

/** Popover tag picker for a detail view. */
export const EntityTagPicker: React.FC<EntityTagPickerProps> = ({
  entityType,
  entityId,
  showBadges = true,
  className,
  buttonLabel = 'Tags',
}) => {
  const { getTags, toggleTag, addTag } = useEntityTags(entityType);
  const { createTag } = useTags();
  const assigned: Tag[] = getTags(entityId);

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {showBadges && assigned.map((tag) => <TagBadge key={tag.id} tag={tag} />)}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <TagIcon className="h-3.5 w-3.5" />
            {buttonLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-auto bg-popover z-50">
          <TagPickerList
            selectedIds={assigned.map((t) => t.id)}
            onToggle={(tagId) => toggleTag(entityId, tagId)}
            onCreate={async (name, color) => {
              const tag = await createTag.mutateAsync({ name, color });
              await addTag(entityId, tag.id);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
