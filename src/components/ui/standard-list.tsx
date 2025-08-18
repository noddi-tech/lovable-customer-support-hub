import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationFooter } from "./pagination-footer";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListColumn, BulkAction } from "@/types/pagination";

interface StandardListProps<T extends { id: string }> {
  data: T[];
  columns: ListColumn<T>[];
  isLoading?: boolean;
  error?: Error | null;
  
  // Selection
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  selectable?: boolean;
  
  // Bulk actions
  bulkActions?: BulkAction<T>[];
  
  // Pagination
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  startItem: number;
  endItem: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  
  // Sorting
  currentSort?: string;
  currentSortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  
  // Row actions
  onRowClick?: (item: T) => void;
  getRowClassName?: (item: T) => string;
  
  // Empty state
  emptyMessage?: string;
  emptyDescription?: string;
}

export function StandardList<T extends { id: string }>({
  data,
  columns,
  isLoading = false,
  error,
  selectedItems = [],
  onSelectionChange,
  selectable = false,
  bulkActions = [],
  currentPage,
  totalPages,
  pageSize,
  totalCount,
  startItem,
  endItem,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
  onPageSizeChange,
  currentSort,
  currentSortDirection,
  onSort,
  onRowClick,
  getRowClassName,
  emptyMessage = "No items found",
  emptyDescription = "Try adjusting your search or filter criteria"
}: StandardListProps<T>) {
  const [localSelectedItems, setLocalSelectedItems] = useState<T[]>([]);
  
  const effectiveSelectedItems = selectedItems.length > 0 ? selectedItems : localSelectedItems;
  const effectiveOnSelectionChange = onSelectionChange || setLocalSelectedItems;

  const isItemSelected = (item: T) => effectiveSelectedItems.some(selected => selected.id === item.id);
  const isAllSelected = data.length > 0 && data.every(item => isItemSelected(item));
  const isIndeterminate = effectiveSelectedItems.length > 0 && !isAllSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      effectiveOnSelectionChange(data);
    } else {
      effectiveOnSelectionChange([]);
    }
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    if (checked) {
      effectiveOnSelectionChange([...effectiveSelectedItems, item]);
    } else {
      effectiveOnSelectionChange(effectiveSelectedItems.filter(selected => selected.id !== item.id));
    }
  };

  const handleSortClick = (column: ListColumn<T>) => {
    if (!column.sortable || !onSort) return;
    
    const columnKey = String(column.key);
    if (currentSort === columnKey) {
      // Toggle direction
      const newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnKey, newDirection);
    } else {
      // New sort column
      onSort(columnKey, 'desc');
    }
  };

  const getSortIcon = (column: ListColumn<T>) => {
    if (!column.sortable) return null;
    
    const columnKey = String(column.key);
    if (currentSort !== columnKey) {
      return <ArrowUpDown className="h-4 w-4 opacity-50" />;
    }
    
    return currentSortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4" />
      : <ArrowDown className="h-4 w-4" />;
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load data</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      {(selectable && bulkActions.length > 0 && effectiveSelectedItems.length > 0) && (
        <div className="sticky top-0 bg-primary/10 border-b border-border px-4 py-2 z-10">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {effectiveSelectedItems.length} selected
            </Badge>
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                variant={action.destructive ? "destructive" : "outline"}
                size="sm"
                onClick={() => action.action(effectiveSelectedItems)}
                className="h-8"
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background border-b border-border z-10">
            <tr>
              {selectable && (
                <th className="w-12 p-4">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "text-left p-4 font-medium text-muted-foreground",
                    column.sortable && "cursor-pointer hover:text-foreground",
                    column.width && `w-[${column.width}]`
                  )}
                  onClick={() => handleSortClick(column)}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {getSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: pageSize }).map((_, index) => (
                <tr key={index} className="border-b border-border">
                  {selectable && (
                    <td className="p-4">
                      <Skeleton className="h-4 w-4" />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={String(column.key)} className="p-4">
                      <Skeleton className="h-4 w-full max-w-[200px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-8 text-center">
                  <div className="text-muted-foreground">
                    <p className="font-medium mb-1">{emptyMessage}</p>
                    <p className="text-sm">{emptyDescription}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-border hover:bg-muted/50 transition-colors",
                    onRowClick && "cursor-pointer",
                    isItemSelected(item) && "bg-primary/5",
                    getRowClassName?.(item)
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isItemSelected(item)}
                        onCheckedChange={(checked) => handleSelectItem(item, !!checked)}
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    const value = item[column.key as keyof T];
                    return (
                      <td key={String(column.key)} className="p-4">
                        {column.render ? column.render(value, item) : String(value || '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalCount={totalCount}
        startItem={startItem}
        endItem={endItem}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        isLoading={isLoading}
      />
    </div>
  );
}