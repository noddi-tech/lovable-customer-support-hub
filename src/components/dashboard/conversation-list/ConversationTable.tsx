import { memo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ConversationTableRow } from './ConversationTableRow';
import { TableHeaderCell } from './TableHeaderCell';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { Clock, Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
    isLoading,
    state,
    dispatch,
  } = useConversationList();
  const { t } = useTranslation();

  const handleSort = (key: string) => {
    dispatch({ type: 'SET_SORT', payload: key });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      filteredConversations.forEach(conv => {
        dispatch({ type: 'TOGGLE_BULK_SELECTION', payload: { id: conv.id, selected: true } });
      });
    } else {
      dispatch({ type: 'CLEAR_BULK_SELECTION' });
    }
  };

  const allSelected = state.bulkSelectionMode &&
    filteredConversations.length > 0 &&
    filteredConversations.every(conv => state.selectedConversations.has(conv.id));

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

  if (filteredConversations.length === 0) {
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
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10 border-b">
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
        <TableBody>
          {filteredConversations.map((conversation) => (
            <ConversationTableRow
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedConversation?.id === conversation.id}
              onSelect={onSelectConversation}
              isBulkSelected={state.selectedConversations.has(conversation.id)}
              onBulkSelect={(id, selected) =>
                dispatch({ type: 'TOGGLE_BULK_SELECTION', payload: { id, selected } })
              }
              showBulkCheckbox={state.bulkSelectionMode}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

ConversationTable.displayName = 'ConversationTable';
