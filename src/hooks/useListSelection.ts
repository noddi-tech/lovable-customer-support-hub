import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBulkRangeSelect } from '@/hooks/useBulkRangeSelect';

/**
 * Generic multi-row selection for list views.
 *
 * Keeps a Set of selected ids, supports shift-click ranges and select-all, and
 * automatically drops ids that disappear from the list (filtering, refetch).
 */
export function useListSelection(orderedIds: string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const setSelection = useCallback((ids: string[], selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (selected ? next.add(id) : next.delete(id)));
      return next;
    });
  }, []);

  const toggle = useBulkRangeSelect(orderedIds, setSelection);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(orderedIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [orderedIds]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const selectAll = useCallback(
    (checked: boolean) => setSelection(orderedIds, checked),
    [orderedIds, setSelection],
  );

  const ids = useMemo(() => [...selectedIds], [selectedIds]);
  const allSelected = orderedIds.length > 0 && orderedIds.every((id) => selectedIds.has(id));

  return {
    selectedIds,
    ids,
    count: selectedIds.size,
    isSelected: useCallback((id: string) => selectedIds.has(id), [selectedIds]),
    toggle,
    setSelection,
    selectAll,
    allSelected,
    clear,
  };
}
