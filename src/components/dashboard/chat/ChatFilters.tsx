import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export type ChatFilterType = 'active' | 'waiting' | 'ended' | 'all';

interface ChatFiltersProps {
  currentFilter: ChatFilterType;
  onFilterChange: (filter: ChatFilterType) => void;
  counts?: {
    active: number;
    waiting: number;
    ended: number;
    all: number;
  };
}

export const ChatFilters: React.FC<ChatFiltersProps> = ({
  currentFilter,
  onFilterChange,
  counts = { active: 0, waiting: 0, ended: 0, all: 0 },
}) => {
  const filters: { key: ChatFilterType; label: string; count: number }[] = [
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'waiting', label: 'Waiting', count: counts.waiting },
    { key: 'ended', label: 'Ended', count: counts.ended },
    { key: 'all', label: 'All', count: counts.all },
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            currentFilter === filter.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {filter.label}
          {filter.count > 0 && (
            <Badge 
              variant={currentFilter === filter.key ? "secondary" : "outline"}
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 min-w-[16px]",
                currentFilter === filter.key && "bg-primary-foreground/20 text-primary-foreground"
              )}
            >
              {filter.count}
            </Badge>
          )}
        </button>
      ))}
    </div>
  );
};
