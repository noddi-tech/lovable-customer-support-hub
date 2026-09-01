import React from 'react';
import { cn } from '@/lib/utils';
import type { Tag } from '@/hooks/useTags';

interface TagBadgeProps {
  tag: Tag;
  compact?: boolean;
  className?: string;
}

/** Colored badge for a custom tag; the color is a per-tag user choice. */
export const TagBadge: React.FC<TagBadgeProps> = ({ tag, compact, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap',
      compact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs',
      className,
    )}
    style={{
      borderColor: `${tag.color}66`,
      backgroundColor: `${tag.color}1a`,
      color: tag.color,
    }}
    title={tag.name}
  >
    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
    <span className="truncate max-w-[9rem]">{tag.name}</span>
  </span>
);

interface TagBadgeListProps {
  tags: Tag[];
  compact?: boolean;
  max?: number;
  className?: string;
}

export const TagBadgeList: React.FC<TagBadgeListProps> = ({ tags, compact, max = 3, className }) => {
  if (!tags.length) return null;
  const shown = tags.slice(0, max);
  const rest = tags.length - shown.length;
  return (
    <span className={cn('inline-flex items-center gap-1 flex-wrap', className)}>
      {shown.map((tag) => (
        <TagBadge key={tag.id} tag={tag} compact={compact} />
      ))}
      {rest > 0 && (
        <span className="text-[10px] text-muted-foreground" title={tags.map((t) => t.name).join(', ')}>
          +{rest}
        </span>
      )}
    </span>
  );
};
