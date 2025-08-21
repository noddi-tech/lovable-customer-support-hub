import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Search, Grid, List, Filter, SortAsc, SortDesc } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-responsive';

interface FilterOption {
  id: string;
  label: string;
  value: string | number;
  count?: number;
}

interface SortOption {
  id: string;
  label: string;
  value: string;
}

interface StandardListViewProps {
  title?: string;
  items: any[];
  renderItem: (item: any, index: number) => ReactNode;
  isLoading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  showViewToggle?: boolean;
  filters?: FilterOption[];
  activeFilters?: string[];
  onFilterChange?: (filterId: string, active: boolean) => void;
  sortOptions?: SortOption[];
  activeSortOption?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (option: string, direction: 'asc' | 'desc') => void;
  emptyState?: {
    icon?: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
  itemClassName?: string;
  showItemCount?: boolean;
}

export const StandardListView: React.FC<StandardListViewProps> = ({
  title,
  items,
  renderItem,
  isLoading = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  viewMode = 'list',
  onViewModeChange,
  showViewToggle = false,
  filters = [],
  activeFilters = [],
  onFilterChange,
  sortOptions = [],
  activeSortOption,
  sortDirection = 'desc',
  onSortChange,
  emptyState,
  className,
  itemClassName,
  showItemCount = true
}) => {
  const isMobile = useIsMobile();

  const renderFilters = () => {
    if (filters.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilters.includes(filter.id);
          return (
            <Badge
              key={filter.id}
              variant={isActive ? 'default' : 'secondary'}
              className={cn(
                "cursor-pointer transition-all duration-200 hover-scale",
                isActive && "bg-primary text-primary-foreground"
              )}
              onClick={() => onFilterChange?.(filter.id, !isActive)}
            >
              {filter.label}
              {filter.count !== undefined && (
                <span className="ml-1 opacity-70">({filter.count})</span>
              )}
            </Badge>
          );
        })}
      </div>
    );
  };

  const renderSortControls = () => {
    if (sortOptions.length === 0) return null;

    return (
      <div className="flex items-center space-x-2">
        <Select 
          value={activeSortOption} 
          onValueChange={(value) => onSortChange?.(value, sortDirection)}
        >
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.id} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onSortChange?.(activeSortOption || sortOptions[0]?.value, sortDirection === 'asc' ? 'desc' : 'asc')}
        >
          {sortDirection === 'asc' ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle sort direction</span>
        </Button>
      </div>
    );
  };

  const renderEmptyState = () => {
    if (!emptyState || items.length > 0) return null;

    const Icon = emptyState.icon;

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        {Icon && (
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {emptyState.title}
        </h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          {emptyState.description}
        </p>
        {emptyState.action && (
          <Button onClick={emptyState.action.onClick} className="hover-scale">
            {emptyState.action.label}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm space-y-4">
        {/* Title and Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {title && (
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            )}
            {showItemCount && !isLoading && (
              <Badge variant="secondary" className="text-xs">
                {items.length}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {renderSortControls()}
            
            {showViewToggle && onViewModeChange && !isMobile && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center rounded-md border border-border">
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0 rounded-r-none border-r"
                    onClick={() => onViewModeChange('list')}
                  >
                    <List className="h-4 w-4" />
                    <span className="sr-only">List view</span>
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 w-8 p-0 rounded-l-none"
                    onClick={() => onViewModeChange('grid')}
                  >
                    <Grid className="h-4 w-4" />
                    <span className="sr-only">Grid view</span>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters Row */}
        <div className="space-y-3">
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          )}
          
          {filters.length > 0 && (
            <div className="flex items-center space-x-3">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              {renderFilters()}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted/50 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className={cn(
            "p-2",
            viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" 
              : "space-y-1"
          )}>
            {items.map((item, index) => (
              <div 
                key={item.id || index} 
                className={cn(
                  "animate-fade-in",
                  itemClassName
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};