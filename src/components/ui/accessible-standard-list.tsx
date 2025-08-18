import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationFooter } from "./pagination-footer";
import { ResponsivePane, ResponsiveTable, ResponsiveToolbar } from "./responsive-components";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListColumn, BulkAction } from "@/types/pagination";
import { useKeyboardNavigation } from "@/hooks/useKeyboardNavigation";
import { useAriaAnnouncement } from "@/hooks/useAriaAnnouncement";

interface AccessibleStandardListProps<T extends { id: string }> {
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

  // Accessibility
  ariaLabel?: string;
  ariaDescription?: string;
}

export function AccessibleStandardList<T extends { id: string }>({
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
  emptyDescription = "Try adjusting your search or filter criteria",
  ariaLabel = "Data table",
  ariaDescription
}: AccessibleStandardListProps<T>) {
  const [localSelectedItems, setLocalSelectedItems] = useState<T[]>([]);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { announce } = useAriaAnnouncement();
  
  const effectiveSelectedItems = selectedItems.length > 0 ? selectedItems : localSelectedItems;
  const effectiveOnSelectionChange = onSelectionChange || setLocalSelectedItems;

  const isItemSelected = (item: T) => effectiveSelectedItems.some(selected => selected.id === item.id);
  const isAllSelected = data.length > 0 && data.every(item => isItemSelected(item));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      effectiveOnSelectionChange(data);
      announce(`Selected all ${data.length} items`);
    } else {
      effectiveOnSelectionChange([]);
      announce("Deselected all items");
    }
  };

  const handleSelectItem = (item: T, checked: boolean) => {
    if (checked) {
      effectiveOnSelectionChange([...effectiveSelectedItems, item]);
      announce(`Selected item`);
    } else {
      effectiveOnSelectionChange(effectiveSelectedItems.filter(selected => selected.id !== item.id));
      announce(`Deselected item`);
    }
  };

  const handleSortClick = (column: ListColumn<T>) => {
    if (!column.sortable || !onSort) return;
    
    const columnKey = String(column.key);
    if (currentSort === columnKey) {
      // Toggle direction
      const newDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnKey, newDirection);
      announce(`Sorted ${column.label} ${newDirection}ending`);
    } else {
      // New sort column
      onSort(columnKey, 'desc');
      announce(`Sorted by ${column.label} descending`);
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

  // Keyboard navigation
  const handleMoveUp = useCallback(() => {
    if (data.length === 0) return;
    const newIndex = Math.max(0, focusedRowIndex - 1);
    setFocusedRowIndex(newIndex);
    
    // Focus the row
    const row = tableRef.current?.querySelector(`[data-row-index="${newIndex}"]`) as HTMLElement;
    row?.focus();
    
    announce(`Row ${newIndex + 1} of ${data.length}`);
  }, [focusedRowIndex, data.length, announce]);

  const handleMoveDown = useCallback(() => {
    if (data.length === 0) return;
    const newIndex = Math.min(data.length - 1, focusedRowIndex + 1);
    setFocusedRowIndex(newIndex);
    
    // Focus the row
    const row = tableRef.current?.querySelector(`[data-row-index="${newIndex}"]`) as HTMLElement;
    row?.focus();
    
    announce(`Row ${newIndex + 1} of ${data.length}`);
  }, [focusedRowIndex, data.length, announce]);

  const handleSelect = useCallback(() => {
    if (data.length === 0) return;
    const item = data[focusedRowIndex];
    if (item && onRowClick) {
      onRowClick(item);
      announce(`Selected ${item.id}`);
    }
  }, [data, focusedRowIndex, onRowClick, announce]);

  const handleEscape = useCallback(() => {
    // Focus the container to exit table navigation
    containerRef.current?.focus();
    announce("Exited table navigation");
  }, [announce]);

  useKeyboardNavigation({
    navigation: {
      onMoveUp: handleMoveUp,
      onMoveDown: handleMoveDown,
      onSelect: handleSelect,
      onEscape: handleEscape,
      enabled: !isLoading
    },
    containerRef
  });

  // Reset focused row when data changes
  useEffect(() => {
    setFocusedRowIndex(0);
  }, [data]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-8" role="alert">
        <div className="text-center">
          <p className="text-destructive mb-2">Failed to load data</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsivePane 
      className="flex flex-col h-full" 
      ref={containerRef}
      tabIndex={-1}
      aria-label={ariaLabel}
      aria-description={ariaDescription}
    >
      {/* Toolbar */}
      {(selectable && bulkActions.length > 0 && effectiveSelectedItems.length > 0) && (
        <ResponsiveToolbar 
          className="bg-primary/10 border-border"
          role="toolbar"
          aria-label="Bulk actions"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {effectiveSelectedItems.length} selected
            </Badge>
            {bulkActions.map((action) => (
              <Button
                key={action.id}
                variant={action.destructive ? "destructive" : "outline"}
                size="sm"
                onClick={() => {
                  action.action(effectiveSelectedItems);
                  announce(`${action.label} action performed on ${effectiveSelectedItems.length} items`);
                }}
                className="h-8"
                aria-describedby={`${action.id}-description`}
              >
                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            ))}
          </div>
        </ResponsiveToolbar>
      )}

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <ResponsiveTable>
          <table 
            ref={tableRef}
            className="w-full min-w-full"
            role="table"
            aria-label={ariaLabel}
            aria-rowcount={data.length + 1} // +1 for header
            aria-colcount={columns.length + (selectable ? 1 : 0)}
          >
            <thead className="sticky top-0 bg-background border-b border-border z-10">
              <tr role="row">
                {selectable && (
                  <th 
                    className="w-12 p-2 sm:p-4"
                    role="columnheader"
                    aria-label="Select all rows"
                  >
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label={`Select all ${data.length} rows`}
                    />
                  </th>
                )}
                {columns.map((column, index) => (
                  <th
                    key={String(column.key)}
                    className={cn(
                      "text-left p-2 sm:p-4 font-medium text-muted-foreground text-xs sm:text-sm",
                      column.sortable && "cursor-pointer hover:text-foreground",
                      column.width && `w-[${column.width}]`
                    )}
                    onClick={() => handleSortClick(column)}
                    role="columnheader"
                    aria-sort={
                      currentSort === String(column.key) 
                        ? currentSortDirection === 'asc' ? 'ascending' : 'descending'
                        : column.sortable ? 'none' : undefined
                    }
                    tabIndex={column.sortable ? 0 : -1}
                    onKeyDown={(e) => {
                      if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleSortClick(column);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      {getSortIcon(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody role="rowgroup">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: pageSize }).map((_, index) => (
                  <tr key={index} className="border-b border-border" role="row">
                    {selectable && (
                      <td className="p-2 sm:p-4" role="cell">
                        <Skeleton className="h-4 w-4" />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={String(column.key)} className="p-2 sm:p-4" role="cell">
                        <Skeleton className="h-4 w-full max-w-[200px]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr role="row">
                  <td 
                    colSpan={columns.length + (selectable ? 1 : 0)} 
                    className="p-8 text-center"
                    role="cell"
                  >
                    <div className="text-muted-foreground" role="status">
                      <p className="font-medium mb-1">{emptyMessage}</p>
                      <p className="text-sm">{emptyDescription}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((item, index) => (
                  <tr
                    key={item.id}
                    data-row-index={index}
                    className={cn(
                      "border-b border-border hover:bg-muted/50 transition-colors focus:bg-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/50",
                      onRowClick && "cursor-pointer",
                      isItemSelected(item) && "bg-primary/5",
                      focusedRowIndex === index && "ring-2 ring-primary/50",
                      getRowClassName?.(item)
                    )}
                    onClick={() => onRowClick?.(item)}
                    role="row"
                    tabIndex={0}
                    aria-selected={isItemSelected(item)}
                    aria-rowindex={index + 2} // +2 because header is row 1
                  >
                    {selectable && (
                      <td 
                        className="p-2 sm:p-4" 
                        onClick={(e) => e.stopPropagation()}
                        role="cell"
                      >
                        <Checkbox
                          checked={isItemSelected(item)}
                          onCheckedChange={(checked) => handleSelectItem(item, !!checked)}
                          aria-label={`Select row ${index + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((column, colIndex) => {
                      const value = item[column.key as keyof T];
                      return (
                        <td 
                          key={String(column.key)} 
                          className="p-2 sm:p-4"
                          role="cell"
                          aria-describedby={`col-${colIndex}-desc`}
                        >
                          {column.render ? column.render(value, item) : String(value || '')}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
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
        onPageChange={(page) => {
          onPageChange(page);
          announce(`Navigated to page ${page} of ${totalPages}`);
        }}
        onPageSizeChange={(size) => {
          onPageSizeChange(size);
          announce(`Changed page size to ${size} items`);
        }}
        isLoading={isLoading}
      />
      
      {/* Screen reader instructions */}
      <div className="sr-only" aria-live="polite">
        Use arrow keys or J/K to navigate rows, Enter to select, Escape to exit table navigation.
        {selectable && " Use Space to toggle row selection."}
      </div>
    </ResponsivePane>
  );
}