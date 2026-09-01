import { memo, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { Checkbox } from '@/components/ui/checkbox';
import { ConversationTableRow } from './ConversationTableRow';
import { FlexHeaderCell } from './FlexHeaderCell';
import { SlaAlertBanner } from './SlaAlertBanner';
import { useBulkRangeSelect } from '@/hooks/useBulkRangeSelect';

import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useTranslation } from 'react-i18next';
import { Clock, Inbox } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-responsive';

// Separate memoized row component to prevent re-creation on every parent render
interface VirtualizedRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    conversations: Conversation[];
    selectedConversation?: Conversation;
    onSelectConversation: (conversation: Conversation) => void;
    bulkSelectionMode: boolean;
    selectedConversations: Set<string>;
    dispatch: any;
    onBulkSelect: (id: string, selected: boolean, shiftKey?: boolean) => void;
  };
}

const VirtualizedRow = memo(({ index, style, data }: VirtualizedRowProps) => {
  const { conversations, selectedConversation, onSelectConversation, bulkSelectionMode, selectedConversations, onBulkSelect } = data;
  const conversation = conversations[index];

  if (!conversation) {
    return (
      <div style={style} className="flex items-center px-4 border-b animate-pulse">
        <div className="h-6 w-6 bg-muted rounded-full mr-3"></div>
        <div className="flex-1 flex gap-4">
          <div className="h-4 bg-muted rounded w-32"></div>
          <div className="h-4 bg-muted rounded flex-1"></div>
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="h-4 bg-muted rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <ConversationTableRow
      conversation={conversation}
      isSelected={selectedConversation?.id === conversation.id}
      onSelect={onSelectConversation}
      isBulkSelected={selectedConversations.has(conversation.id)}
      onBulkSelect={onBulkSelect}
      showBulkCheckbox={bulkSelectionMode}
      style={style}
    />
  );
});

VirtualizedRow.displayName = 'VirtualizedRow';

interface VirtualizedConversationTableProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
}

const ITEM_HEIGHT = 68;
const MOBILE_ITEM_HEIGHT = 100;
const HEADER_HEIGHT = 40;
const OVERSCAN_COUNT = 5;

const VirtualizedConversationTable = memo(({ onSelectConversation, selectedConversation }: VirtualizedConversationTableProps) => {
  const {
    filteredConversations,
    paginatedConversations,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    state,
    dispatch,
    selectedInboxId,
  } = useConversationList();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  // Show the inbox column only when the list spans every inbox.
  const showInboxColumn = !selectedInboxId || selectedInboxId === 'all';


  const conversations = useMemo(() => paginatedConversations, [paginatedConversations]);
  const conversationCount = conversations.length;

  const isItemLoaded = (index: number) => !hasNextPage || index < conversationCount;

  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  };

  const handleSort = (key: string) => {
    dispatch({ type: 'SET_SORT', payload: key });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      dispatch({
        type: 'SET_BULK_SELECTION',
        payload: { ids: conversations.map(c => c.id), selected: true },
      });
    } else {
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    }
  };

  const orderedIds = useMemo(() => conversations.map(c => c.id), [conversations]);
  const setSelection = useCallback(
    (ids: string[], selected: boolean) => dispatch({ type: 'SET_BULK_SELECTION', payload: { ids, selected } }),
    [dispatch],
  );
  const rangeSelect = useBulkRangeSelect(orderedIds, setSelection);
  // Cmd/Ctrl- or Shift-click starts selection mode implicitly.
  const handleBulkSelect = useCallback(
    (id: string, selected: boolean, shiftKey?: boolean) => {
      dispatch({ type: 'ENABLE_BULK_MODE' });
      rangeSelect(id, selected, shiftKey);
    },
    [dispatch, rangeSelect],
  );

  const allSelected = state.bulkSelectionMode &&
    conversations.length > 0 &&
    conversations.every(conv => state.selectedConversations.has(conv.id));

  // Prepare itemData for react-window - memoize to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    conversations,
    selectedConversation,
    onSelectConversation,
    bulkSelectionMode: state.bulkSelectionMode,
    selectedConversations: state.selectedConversations,
    dispatch,
    onBulkSelect: handleBulkSelect,
  }), [conversations, selectedConversation, onSelectConversation, state.bulkSelectionMode, state.selectedConversations, dispatch, handleBulkSelect]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
          <p>{t('dashboard.conversationList.loadingConversations', 'Loading conversations...')}</p>
        </div>
      </div>
    );
  }

  if (conversationCount === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">{t('dashboard.conversationList.noConversations', 'No conversations found')}</p>
          <p className="text-sm">{t('dashboard.conversationList.noConversationsDescription', 'There are no conversations matching your current filters.')}</p>
        </div>
      </div>
    );
  }

  // Columns have fixed pixel widths, so below this width they would squeeze
  // into each other. Scroll horizontally instead of overlapping.
  const minTableWidth = isMobile
    ? undefined
    : 32 + // horizontal padding
      (state.bulkSelectionMode ? 40 : 0) +
      192 + // customer
      (showInboxColumn ? 160 : 0) +
      240 + // conversation (minimum)
      128 + 96 + 112 + 144 + 80 + 112 + 48; // status..actions

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full relative overflow-x-auto">
      {/* SLA emergency banner — breached or about-to-breach conversations in this inbox */}
      <SlaAlertBanner conversations={filteredConversations} onSelectConversation={onSelectConversation} />

      {/* Loading overlay - doesn't unmount the list */}
      {isFetchingNextPage && hasNextPage && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10 bg-background/90 border rounded-full px-3 py-1 text-xs flex items-center gap-2 shadow-lg">
          <Clock className="w-3 h-3 animate-spin" />
          Loading more... ({conversationCount})
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 h-full" style={minTableWidth ? { minWidth: minTableWidth } : undefined}>

      {/*
        Fixed header. Rendered as a flex row (not a <table>) so the column
        widths line up exactly with the virtualized flex rows below.
      */}
      {!isMobile && (
      <div className="bg-card border-b">
        <div className="flex items-center px-4">
          {state.bulkSelectionMode && (
            <div className="w-10 p-2 shrink-0">
              <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
            </div>
          )}
            <FlexHeaderCell
              label=""
              sortKey="channel"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-12 shrink-0"
            />
          <FlexHeaderCell
            label={t('dashboard.conversationList.customer', 'Customer')}
            sortKey="customer"
            currentSort={state.tableSort}
            onSort={handleSort}
            className="w-48 shrink-0"
          />
          {showInboxColumn && (
            <FlexHeaderCell
              label={t('dashboard.conversationList.inbox', 'Inbox')}
              sortKey="inbox"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-40 shrink-0"
            />
          )}

          <FlexHeaderCell
            label={t('dashboard.conversationList.conversation', 'Conversation')}
            sortKey="subject"
            currentSort={state.tableSort}
            onSort={handleSort}
            className="flex-1 min-w-0"
          />
          <FlexHeaderCell
            label={t('dashboard.conversationList.status', 'Status')}
            sortKey="status"
            currentSort={state.tableSort}
            onSort={handleSort}
            className="w-32 shrink-0"
          />
          <FlexHeaderCell
            label={t('dashboard.conversationList.priority', 'Priority')}
            sortKey="priority"
            currentSort={state.tableSort}
            onSort={handleSort}
            className="w-24 shrink-0"
          />
          <FlexHeaderCell
            label={t('dashboard.conversationList.received', 'Received')}
            sortKey="received"
            currentSort={state.tableSort}
            onSort={handleSort}
            className="w-36 shrink-0"
          />
          <FlexHeaderCell
            label={t('dashboard.conversationList.waiting', 'Waiting')}
            sortKey="waiting"
            currentSort={state.tableSort}
            onSort={handleSort}
            className="w-20 shrink-0"
          />
          <FlexHeaderCell
            label={t('dashboard.conversationList.sla', 'SLA')}
            sortKey="sla"
            currentSort={state.tableSort}
            onSort={handleSort}
            className="w-28 shrink-0"
          />
          <div className="w-12 p-2 shrink-0" />
        </div>
      </div>
      )}


      {/* Virtualized Table Body */}
      <div className="flex-1 min-h-0 h-full">
        <AutoSizer>
          {({ height, width }) => {
            const safeHeight = Math.max(height || 300, 300);
            return (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={hasNextPage ? conversationCount + 1 : conversationCount}
              loadMoreItems={loadMoreItems}
            >
              {({ onItemsRendered, ref }) => (
                <List
                  ref={ref}
                  height={safeHeight}
                  width={width}
                  itemCount={hasNextPage ? conversationCount + 1 : conversationCount}
                  itemSize={isMobile ? MOBILE_ITEM_HEIGHT : ITEM_HEIGHT}
                  itemData={itemData}
                  onItemsRendered={onItemsRendered}
                  overscanCount={OVERSCAN_COUNT}
                >
                  {VirtualizedRow}
                </List>
              )}
            </InfiniteLoader>
            );
          }}
        </AutoSizer>
      </div>
      </div>
    </div>
  );
});

VirtualizedConversationTable.displayName = 'VirtualizedConversationTable';

export { VirtualizedConversationTable };
