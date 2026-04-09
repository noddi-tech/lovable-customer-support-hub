import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { useConversationList } from '@/contexts/ConversationListContext';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export const ConversationPaginationFooter = memo(() => {
  const { filteredConversations, totalCount, state, dispatch } = useConversationList();
  const { t } = useTranslation();

  const displayCount = filteredConversations.length;
  const pageSize = state.pageSize;
  const currentPage = state.currentPage;
  const totalPages = Math.max(1, Math.ceil(displayCount / pageSize));

  // Clamp current page
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: safePage });
  }

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border-t bg-muted/30 text-xs text-muted-foreground shrink-0">
      {/* Left: total count */}
      <span>
        {t('dashboard.conversationList.totalItems', 'Total of {{count}} item(s)', { count: displayCount })}
      </span>

      {/* Right: page size + navigation */}
      <div className="flex items-center gap-2">
        {/* Page size selector */}
        <Select
          value={String(pageSize)}
          onValueChange={(val) => dispatch({ type: 'SET_PAGE_SIZE', payload: Number(val) })}
        >
          <SelectTrigger className="h-7 w-[70px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)} className="text-xs">
                {size} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Page indicator */}
        <span className="tabular-nums">
          {safePage} / {totalPages}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={safePage <= 1}
            onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 })}
          >
            <ChevronFirst className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={safePage <= 1}
            onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: safePage - 1 })}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={safePage >= totalPages}
            onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: safePage + 1 })}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={safePage >= totalPages}
            onClick={() => dispatch({ type: 'SET_CURRENT_PAGE', payload: totalPages })}
          >
            <ChevronLast className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
});

ConversationPaginationFooter.displayName = 'ConversationPaginationFooter';
