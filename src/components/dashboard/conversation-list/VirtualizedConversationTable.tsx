import { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { Table, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConversationTableRow } from './ConversationTableRow';
import { TableHeaderCell } from './TableHeaderCell';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useTranslation } from 'react-i18next';
import { Clock, Inbox } from 'lucide-react';

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
  };
}

const VirtualizedRow = memo(({ index, style, data }: VirtualizedRowProps) => {
  const { conversations, selectedConversation, onSelectConversation, bulkSelectionMode, selectedConversations, dispatch } = data;
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
      onBulkSelect={(id, selected) =>
        dispatch({ type: 'TOGGLE_BULK_SELECTION', payload: { id, selected } })
      }
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

const ITEM_HEIGHT = 52;
const HEADER_HEIGHT = 40;
const OVERSCAN_COUNT = 5;

const VirtualizedConversationTable = memo(({ onSelectConversation, selectedConversation }: VirtualizedConversationTableProps) => {
  const {
    filteredConversations,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    state,
    dispatch,
  } = useConversationList();
  const { t } = useTranslation();

  const conversations = useMemo(() => filteredConversations, [filteredConversations]);
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
      conversations.forEach(conv => {
        dispatch({ type: 'TOGGLE_BULK_SELECTION', payload: { id: conv.id, selected: true } });
      });
    } else {
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    }
  };

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
  }), [conversations, selectedConversation, onSelectConversation, state.bulkSelectionMode, state.selectedConversations, dispatch]);

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

  // Show loading indicator during bulk load to prevent render loop
  if (isFetchingNextPage && hasNextPage && conversationCount > 50) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-50 animate-spin" />
          <p>{t('dashboard.conversationList.loadingAllConversations', 'Loading all conversations...')}</p>
          <p className="text-sm mt-2">{conversationCount} loaded so far</p>
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

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Fixed Table Header */}
      <div className="border-b bg-background">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {state.bulkSelectionMode && (
                <TableHead className="w-10 p-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHeaderCell
                label={t('dashboard.conversationList.customer', 'Customer')}
                sortKey="customer"
                currentSort={state.tableSort}
                onSort={handleSort}
                className="w-48"
              />
              <TableHeaderCell
                label={t('dashboard.conversationList.conversation', 'Conversation')}
                sortKey="subject"
                currentSort={state.tableSort}
                onSort={handleSort}
              />
              <TableHeaderCell
                label={t('dashboard.conversationList.channel', 'Channel')}
                sortKey="channel"
                currentSort={state.tableSort}
                onSort={handleSort}
                className="w-20"
              />
              <TableHeaderCell
                label={t('dashboard.conversationList.waiting', 'Waiting')}
                sortKey="waiting"
                currentSort={state.tableSort}
                onSort={handleSort}
                className="w-24"
              />
              <TableHeaderCell
                label={t('dashboard.conversationList.sla', 'SLA')}
                sortKey="sla"
                currentSort={state.tableSort}
                onSort={handleSort}
                className="w-16"
              />
              <TableHeaderCell
                label={t('dashboard.conversationList.status', 'Status')}
                sortKey="status"
                currentSort={state.tableSort}
                onSort={handleSort}
                className="w-24"
              />
              <TableHeaderCell
                label={t('dashboard.conversationList.priority', 'Priority')}
                sortKey="priority"
                currentSort={state.tableSort}
                onSort={handleSort}
                className="w-24"
              />
              <TableHead className="w-12 p-2"></TableHead>
            </TableRow>
          </TableHeader>
        </Table>
      </div>

      {/* Virtualized Table Body */}
      <div className="flex-1" style={{ minHeight: 200 }}>
        <AutoSizer>
          {({ height, width }) => {
            const safeHeight = Math.max(height, 200);
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
                  itemSize={ITEM_HEIGHT}
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
  );
});

VirtualizedConversationTable.displayName = 'VirtualizedConversationTable';

export { VirtualizedConversationTable };
