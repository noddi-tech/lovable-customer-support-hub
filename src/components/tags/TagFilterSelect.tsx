import React, { useState } from 'react';
import { Check, Plus, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTags } from '@/hooks/useTags';
import { TagBadge } from '@/components/tags/TagBadge';
import { TagCreateForm } from '@/components/tags/TagCreateForm';
import { cn } from '@/lib/utils';

export const UNTAGGED = '__untagged__';

interface TagFilterSelectProps {
  /** Selected tag ids, or the special UNTAGGED value. Empty means "all". */
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}

/** Multi-select tag filter used by every taggable list. */
export const TagFilterSelect: React.FC<TagFilterSelectProps> = ({ value, onChange, className }) => {
  const { tags, createTag } = useTags();
  const [showCreate, setShowCreate] = useState(false);


  const toggle = (id: string) => {
    if (id === UNTAGGED) {
      onChange(value.includes(UNTAGGED) ? [] : [UNTAGGED]);
      return;
    }
    const next = value.filter((v) => v !== UNTAGGED);
    onChange(next.includes(id) ? next.filter((v) => v !== id) : [...next, id]);
  };

  const label = value.length === 0
    ? 'All tags'
    : value.includes(UNTAGGED)
      ? 'Untagged'
      : `${value.length} tag${value.length > 1 ? 's' : ''}`;

  return (
    <DropdownMenu
      modal={false}
      onOpenChange={(open) => {
        if (!open) setShowCreate(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-9 gap-1.5 text-sm', className)}>
          <TagIcon className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn('bg-popover z-50 max-h-72 overflow-y-auto', showCreate ? 'w-auto p-0' : 'w-56')}
      >
        {showCreate ? (
          <TagCreateForm
            onCancel={() => setShowCreate(false)}
            onCreate={async (name, color) => {
              await createTag.mutateAsync({ name, color });
              setShowCreate(false);
            }}
          />
        ) : (
          <>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onChange([]); }} className="gap-2">
              <Check className={cn('h-3.5 w-3.5', value.length === 0 ? 'opacity-100' : 'opacity-0')} />
              All tags
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {tags.map((tag) => (
              <DropdownMenuItem
                key={tag.id}
                onSelect={(e) => { e.preventDefault(); toggle(tag.id); }}
                className="gap-2"
              >
                <Check className={cn('h-3.5 w-3.5 shrink-0', value.includes(tag.id) ? 'opacity-100' : 'opacity-0')} />
                <TagBadge tag={tag} />
              </DropdownMenuItem>
            ))}
            {tags.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); toggle(UNTAGGED); }} className="gap-2">
              <Check className={cn('h-3.5 w-3.5', value.includes(UNTAGGED) ? 'opacity-100' : 'opacity-0')} />
              Untagged
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => { e.preventDefault(); setShowCreate(true); }}
              className="gap-2"
            >
              <Plus className="h-3.5 w-3.5" />
              Create tag
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};


/** Shared predicate: does an entity's tag list satisfy the filter? */
export function matchesTagFilter(tagIds: string[], filter: string[]): boolean {
  if (filter.length === 0) return true;
  if (filter.includes(UNTAGGED)) return tagIds.length === 0;
  return filter.some((id) => tagIds.includes(id));
}
