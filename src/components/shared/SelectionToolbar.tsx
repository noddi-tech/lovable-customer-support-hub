import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  count: number;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onClear: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Sticky bar shown above a list while rows are selected. */
export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  count,
  allSelected,
  onSelectAll,
  onClear,
  className,
  children,
}) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'sticky top-0 z-20 mb-2 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/70 px-3 py-2 backdrop-blur',
        className,
      )}
    >
      <Checkbox
        checked={allSelected}
        onCheckedChange={(checked) => onSelectAll(checked === true)}
        aria-label="Select all rows"
      />
      <span className="text-xs font-medium">{count} selected</span>
      <span className="hidden text-[11px] text-muted-foreground lg:inline">
        Shift-click for a range
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {children}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClear} aria-label="Clear selection">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
