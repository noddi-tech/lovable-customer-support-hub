import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PaginationParams, PaginationResponse, PaginationState } from '@/types/pagination';

interface UsePaginatedQueryOptions<T> {
  queryKey: string[];
  queryFn: (params: PaginationParams) => Promise<PaginationResponse<T>>;
  initialPageSize?: number;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  queryKey,
  queryFn,
  initialPageSize = 25,
  enabled = true
}: UsePaginatedQueryOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Initialize state from URL params
  const [paginationState, setPaginationState] = useState<PaginationState>(() => ({
    page: Number(searchParams.get('page')) || 1,
    pageSize: Number(searchParams.get('pageSize')) || initialPageSize,
    sort: searchParams.get('sort') || undefined,
    sortDirection: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'desc'
  }));

  // Update URL when pagination state changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    if (paginationState.page > 1) {
      newParams.set('page', paginationState.page.toString());
    } else {
      newParams.delete('page');
    }
    
    if (paginationState.pageSize !== initialPageSize) {
      newParams.set('pageSize', paginationState.pageSize.toString());
    } else {
      newParams.delete('pageSize');
    }
    
    if (paginationState.sort) {
      newParams.set('sort', paginationState.sort);
      newParams.set('sortDirection', paginationState.sortDirection || 'desc');
    } else {
      newParams.delete('sort');
      newParams.delete('sortDirection');
    }

    setSearchParams(newParams, { replace: true });
  }, [paginationState, searchParams, setSearchParams, initialPageSize]);

  // Query with current pagination params
  const query = useQuery({
    queryKey: [...queryKey, paginationState],
    queryFn: () => queryFn(paginationState),
    enabled,
    placeholderData: (previousData) => previousData // Keep previous data while loading new page
  });

  // Prefetch next page when idle
  useEffect(() => {
    if (query.data?.hasNextPage && !query.isFetching) {
      const prefetchTimeout = setTimeout(() => {
        queryClient.prefetchQuery({
          queryKey: [...queryKey, { ...paginationState, page: paginationState.page + 1 }],
          queryFn: () => queryFn({ ...paginationState, page: paginationState.page + 1 })
        });
      }, 1000);

      return () => clearTimeout(prefetchTimeout);
    }
  }, [query.data, query.isFetching, queryClient, queryKey, paginationState, queryFn]);

  const setPage = (page: number) => {
    setPaginationState(prev => ({ ...prev, page }));
  };

  const setPageSize = (pageSize: number) => {
    setPaginationState(prev => ({ ...prev, pageSize, page: 1 })); // Reset to page 1
  };

  const setSort = (sort: string, direction: 'asc' | 'desc' = 'desc') => {
    setPaginationState(prev => ({ 
      ...prev, 
      sort, 
      sortDirection: direction,
      page: 1 // Reset to page 1 when sorting
    }));
  };

  const clearSort = () => {
    setPaginationState(prev => ({ 
      ...prev, 
      sort: undefined, 
      sortDirection: 'desc',
      page: 1 
    }));
  };

  return {
    ...query,
    pagination: paginationState,
    setPage,
    setPageSize,
    setSort,
    clearSort,
    // Derived state for easy access
    currentPage: paginationState.page,
    pageSize: paginationState.pageSize,
    totalCount: query.data?.totalCount || 0,
    totalPages: query.data?.totalPages || 0,
    hasNextPage: query.data?.hasNextPage || false,
    hasPreviousPage: query.data?.hasPreviousPage || false,
    // Range info for display
    startItem: query.data ? (paginationState.page - 1) * paginationState.pageSize + 1 : 0,
    endItem: query.data ? Math.min(paginationState.page * paginationState.pageSize, query.data.totalCount) : 0
  };
}