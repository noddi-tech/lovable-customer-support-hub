import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Brand + tag filters shared between the interactions sidebar (InboxList) and
 * the conversation list. They live in the URL so both panes — which sit in
 * different React trees — stay in sync and the view stays shareable.
 */
export function useConversationFilterParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const brand = searchParams.get('brand') || 'all';
  const tagsParam = searchParams.get('tags') || '';

  const tags = useMemo(
    () => tagsParam.split(',').map((t) => t.trim()).filter(Boolean),
    [tagsParam]
  );

  const setBrand = useCallback(
    (value: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value || value === 'all') next.delete('brand');
          else next.set('brand', value);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setTags = useCallback(
    (value: string[]) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!value.length) next.delete('tags');
          else next.set('tags', value.join(','));
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { brand, tags, tagsParam, setBrand, setTags };
}
