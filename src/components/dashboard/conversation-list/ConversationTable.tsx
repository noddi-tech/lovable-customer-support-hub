import { memo, useCallback, useMemo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConversationTableRow } from './ConversationTableRow';
import { TableHeaderCell } from './TableHeaderCell';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { InboxZeroCelebration, AlmostThereBanner } from './InboxZeroCelebration';
import { useBulkRangeSelect } from '@/hooks/useBulkRangeSelect';
import { useIsMobile } from '@/hooks/use-responsive';

interface ConversationTableProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedConversation?: Conversation;
}

export const ConversationTable = memo<ConversationTableProps>(({
  onSelectConversation,
  selectedConversation
}) => {
  const {
    filteredConversations,
    paginatedConversations,
    hiddenByFiltersCount,
    isLoading,
    state,
    dispatch,
    selectedInboxId,
  } = useConversationList();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  // Show the inbox column only when the list spans every inbox.
  const showInboxColumn = !selectedInboxId || selectedInboxId === 'all';


  const handleSort = (key: string) => {
    dispatch({ type: 'SET_SORT', payload: key });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      dispatch({
        type: 'SET_BULK_SELECTION',
        payload: { ids: filteredConversations.map(c => c.id), selected: true },
      });
    } else {
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    }
  };

  const orderedIds = useMemo(() => paginatedConversations.map(c => c.id), [paginatedConversations]);
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
    filteredConversations.length > 0 &&
    filteredConversations.every(conv => state.selectedConversations.has(conv.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        <div className="text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
          <p className="text-sm">{t('dashboard.conversationList.loadingConversations', 'Loading conversations...')}</p>
        </div>
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    // Don't celebrate inbox zero when conversations exist but are hidden by
    // the active filter chips (purpose / priority / search).
    if (hiddenByFiltersCount > 0) {
      return (
        <div className="flex items-center justify-center h-40 p-6">
          <div className="text-center max-w-sm space-y-3">
            <Filter className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">
              {hiddenByFiltersCount} conversation{hiddenByFiltersCount === 1 ? ' is' : 's are'} hidden by
              the active filters in this view.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch({ type: 'SET_PURPOSE_FILTER', payload: 'all' });
                dispatch({ type: 'SET_PRIORITY_FILTER', payload: 'all' });
                dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      );
    }
    return <InboxZeroCelebration />;
  }

  // Mobile: a plain, scrollable card list — no table chrome, no horizontal scroll.
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <AlmostThereBanner count={filteredConversations.length} />
        {paginatedConversations.map((conversation) => (
          <ConversationTableRow
            key={conversation.id}
            conversation={conversation}
            isSelected={selectedConversation?.id === conversation.id}
            onSelect={onSelectConversation}
            isBulkSelected={state.selectedConversations.has(conversation.id)}
            onBulkSelect={handleBulkSelect}
            showBulkCheckbox={state.bulkSelectionMode}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <AlmostThereBanner count={filteredConversations.length} />
      {/* Fixed-width columns: scroll sideways instead of squeezing into each other. */}
      <Table className={showInboxColumn ? 'min-w-[1120px]' : 'min-w-[960px]'}>
        <TableHeader className="sticky top-0 z-20 bg-muted/50 backdrop-blur-sm border-b-2">
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
              label=""
              sortKey="channel"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-12"
            />
            <TableHeaderCell
              label={t('dashboard.conversationList.customer', 'Customer')}
              sortKey="customer"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-48"
            />
            {showInboxColumn && (
              <TableHeaderCell
                label={t('dashboard.conversationList.inbox', 'Inbox')}
                sortKey="inbox"
                currentSort={state.tableSort}
                onSort={handleSort}
                className="w-40"
              />
            )}

            <TableHeaderCell
              label={t('dashboard.conversationList.conversation', 'Conversation')}
              sortKey="subject"
              currentSort={state.tableSort}
              onSort={handleSort}
            />
            {/* Status & Priority before Channel for urgency scanning */}
            <TableHeaderCell
              label={t('dashboard.conversationList.status', 'Status')}
              sortKey="status"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-32"
            />
            <TableHeaderCell
              label={t('dashboard.conversationList.priority', 'Priority')}
              sortKey="priority"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-24"
            />
            <TableHeaderCell
              label={t('dashboard.conversationList.received', 'Received')}
              sortKey="received"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-36"
            />
            <TableHeaderCell
              label={t('dashboard.conversationList.waiting', 'Waiting')}
              sortKey="waiting"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-20"
            />

            <TableHeaderCell
              label={t('dashboard.conversationList.sla', 'SLA')}
              sortKey="sla"
              currentSort={state.tableSort}
              onSort={handleSort}
              className="w-20"
            />
            <TableHead className="w-12 p-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedConversations.map((conversation) => (
            <ConversationTableRow
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversation?.id === conversation.id}
              onSelect={onSelectConversation}
              isBulkSelected={state.selectedConversations.has(conversation.id)}
              onBulkSelect={handleBulkSelect}
              showBulkCheckbox={state.bulkSelectionMode}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

ConversationTable.displayName = 'ConversationTable';
