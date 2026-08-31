import { useCallback, useRef } from 'react';

/**
 * Shift-click range selection for conversation lists.
 *
 * Returns a handler with the shape `(id, selected, shiftKey)`. A plain click
 * toggles a single row and remembers it as the anchor; a shift-click applies
 * the same selected state to every row between the anchor and the clicked row.
 */
export function useBulkRangeSelect(
  orderedIds: string[],
  setSelection: (ids: string[], selected: boolean) => void,
) {
  const anchorRef = useRef<string | null>(null);

  return useCallback(
    (id: string, selected: boolean, shiftKey = false) => {
      const anchor = anchorRef.current;
      if (shiftKey && anchor && anchor !== id) {
        const start = orderedIds.indexOf(anchor);
        const end = orderedIds.indexOf(id);
        if (start !== -1 && end !== -1) {
          const [from, to] = start < end ? [start, end] : [end, start];
          setSelection(orderedIds.slice(from, to + 1), selected);
          anchorRef.current = id;
          return;
        }
      }
      anchorRef.current = id;
      setSelection([id], selected);
    },
    [orderedIds, setSelection],
  );
}
