import { memo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TableHeaderCellProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' | null };
  onSort: (key: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const TableHeaderCell = memo<TableHeaderCellProps>(({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
  align = 'left'
}) => {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const handleClick = () => {
    onSort(sortKey);
  };

  const getSortIcon = () => {
    if (!isActive || direction === null) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    }
    if (direction === 'asc') {
      return <ArrowUp className="h-3 w-3" />;
    }
    return <ArrowDown className="h-3 w-3" />;
  };

  return (
    <th className={cn("h-10 px-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-2 w-full font-medium text-xs",
          align === 'left' && "justify-start",
          align === 'center' && "justify-center",
          align === 'right' && "justify-end",
          isActive && "text-primary"
        )}
        onClick={handleClick}
      >
        <span className="truncate">{label}</span>
        {getSortIcon()}
      </Button>
    </th>
  );
});

TableHeaderCell.displayName = 'TableHeaderCell';
