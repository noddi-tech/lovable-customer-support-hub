import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';
import { NewsletterBlock } from '../NewsletterBuilder';
import { NewsletterBlockRenderer } from './NewsletterBlockRenderer';
import { useNewsletterStore } from './useNewsletterStore';
import { cn } from '@/lib/utils';

interface SortableNewsletterBlockProps {
  block: NewsletterBlock;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  isDarkMode: boolean;
}

export const SortableNewsletterBlock: React.FC<SortableNewsletterBlockProps> = ({
  block,
  index,
  isSelected,
  onSelect,
  isDarkMode
}) => {
  const { deleteBlock } = useNewsletterStore();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBlock(block.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border-2 border-transparent rounded-lg transition-all duration-200 hover:border-primary/20",
        isSelected && "border-primary shadow-sm",
        "mb-2"
      )}
      onClick={onSelect}
    >
      {/* Block Controls */}
      <div className={cn(
        "absolute -left-12 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-1",
        isSelected && "opacity-100"
      )}>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Block Content */}
      <NewsletterBlockRenderer block={block} isDarkMode={isDarkMode} />
    </div>
  );
};