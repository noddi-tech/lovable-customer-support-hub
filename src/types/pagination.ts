export interface PaginationParams {
  page: number;
  pageSize: number;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginationResponse<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  sort?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ListColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  action: (selectedItems: T[]) => void | Promise<void>;
  destructive?: boolean;
}