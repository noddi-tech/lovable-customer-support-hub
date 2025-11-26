import { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import InfiniteLoader from 'react-window-infinite-loader';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConversationTableRow } from './ConversationTableRow';
import { TableHeaderCell } from './TableHeaderCell';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useTranslation } from 'react-i18next';
import { Clock, Inbox } from 'lucide-react';

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

  const Row = memo(({ index, style }: { index: number; style: React.CSSProperties }) => {
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
        isBulkSelected={state.selectedConversations.has(conversation.id)}
        onBulkSelect={(id, selected) =>
          dispatch({ type: 'TOGGLE_BULK_SELECTION', payload: { id, selected } })
        }
        showBulkCheckbox={state.bulkSelectionMode}
        style={style}
      />
    );
  });

  Row.displayName = 'VirtualizedRow';

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
        <AutoSizer key={`virtualized-list-${state.bulkSelectionMode}`}>
          {({ height, width }) => {
            const safeHeight = Math.max(height, 200);
            return (
            <InfiniteLoader
              isItemLoaded={isItemLoaded}
              itemCount={hasNextPage ? conversationCount + 1 : conversationCount}
              loadMoreItems={loadMoreItems}
            >
              {({ onItemsRendered, ref }) => (
                <Table>
                  <TableBody>
                    <List
                      ref={ref}
                      height={safeHeight}
                      width={width}
                      itemCount={hasNextPage ? conversationCount + 1 : conversationCount}
                      itemSize={ITEM_HEIGHT}
                      onItemsRendered={onItemsRendered}
                      overscanCount={OVERSCAN_COUNT}
                    >
                      {Row}
                    </List>
                  </TableBody>
                </Table>
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
