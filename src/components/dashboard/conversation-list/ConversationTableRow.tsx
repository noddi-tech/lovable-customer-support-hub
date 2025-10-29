import { memo, useCallback, useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, Trash2, MessageCircle, Mail, MailOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from 'react-i18next';
import { SLABadge } from './SLABadge';
import { formatDistanceToNow } from 'date-fns';

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary-muted text-primary",
  high: "bg-warning-muted text-warning",
  urgent: "bg-destructive-muted text-destructive",
};

const statusColors = {
  open: "bg-success-muted text-success",
  pending: "bg-warning-muted text-warning",
  resolved: "bg-primary-muted text-primary",
  closed: "bg-muted text-muted-foreground",
};

const channelIcons = {
  email: MessageCircle,
  chat: MessageCircle,
  social: MessageCircle,
  facebook: MessageCircle,
  instagram: MessageCircle,
  whatsapp: MessageCircle,
};

interface ConversationTableRowProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  isBulkSelected?: boolean;
  onBulkSelect?: (id: string, selected: boolean) => void;
  showBulkCheckbox?: boolean;
  style?: React.CSSProperties;
}

export const ConversationTableRow = memo<ConversationTableRowProps>(({
  conversation,
  isSelected,
  onSelect,
  isBulkSelected = false,
  onBulkSelect,
  showBulkCheckbox = false,
  style
}) => {
  const { dispatch, archiveConversation, toggleConversationRead } = useConversationList();
  const { conversation: formatConversationTime } = useDateFormatting();
  const { inboxes } = useOptimizedCounts();
  const { t } = useTranslation();

  const computedValues = useMemo(() => {
    const ChannelIcon = channelIcons[conversation.channel] || MessageCircle;
    const customerName = conversation.customer?.full_name || 'Unknown';
    const customerEmail = conversation.customer?.email || '';
    const subjectText = conversation.subject || t('dashboard.conversation.noSubject', 'No Subject');
    const statusLabel = t(`conversation.${conversation.status}`, conversation.status);
    const priorityLabel = t(`conversation.${conversation.priority}`, conversation.priority);
    
    // Calculate waiting time
    const waitingTime = conversation.updated_at
      ? formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: false })
      : '-';

    return {
      ChannelIcon,
      customerName,
      customerEmail,
      subjectText,
      statusLabel,
      priorityLabel,
      waitingTime,
      customerInitial: customerName[0] || 'C',
      formattedTime: formatConversationTime(conversation.updated_at),
    };
  }, [conversation, t, formatConversationTime]);

  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    archiveConversation(conversation.id);
  }, [archiveConversation, conversation.id]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'OPEN_DELETE_DIALOG', payload: conversation.id });
  }, [dispatch, conversation.id]);

  const handleRowClick = useCallback(() => {
    if (showBulkCheckbox && onBulkSelect) {
      onBulkSelect(conversation.id, !isBulkSelected);
    } else {
      onSelect(conversation);
    }
  }, [onSelect, conversation, showBulkCheckbox, onBulkSelect, isBulkSelected]);

  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (onBulkSelect) {
      onBulkSelect(conversation.id, checked);
    }
  }, [onBulkSelect, conversation.id]);

  const handleToggleRead = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleConversationRead(conversation.id, conversation.is_read);
  }, [toggleConversationRead, conversation.id, conversation.is_read]);

  return (
    <TableRow
      style={style}
      className={cn(
        "cursor-pointer hover:bg-muted/50 transition-colors",
        isSelected && !showBulkCheckbox && "bg-primary/5",
        isBulkSelected && "bg-primary/10",
        !conversation.is_read && "font-semibold"
      )}
      onClick={handleRowClick}
    >
      {/* Checkbox */}
      {showBulkCheckbox && (
        <TableCell className="w-10 p-2">
          <Checkbox
            checked={isBulkSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
        </TableCell>
      )}

      {/* Customer */}
      <TableCell className="p-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 ring-1 ring-muted shrink-0">
            <AvatarFallback className="text-xs">
              {computedValues.customerInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-sm truncate">{computedValues.customerName}</div>
            {computedValues.customerEmail && (
              <div className="text-xs text-muted-foreground truncate hidden xl:block">
                {computedValues.customerEmail}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Conversation (Subject) */}
      <TableCell className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-sm truncate">{computedValues.subjectText}</span>
          {!conversation.is_read && (
            <Badge className="bg-blue-500 text-white px-1.5 py-0 text-xs shrink-0">
              New
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Channel */}
      <TableCell className="p-2 w-20">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <computedValues.ChannelIcon className="h-3 w-3" />
          <span className="capitalize">{conversation.channel}</span>
        </div>
      </TableCell>

      {/* Waiting Time */}
      <TableCell className="p-2 w-24">
        <div className="text-xs text-muted-foreground">
          {computedValues.waitingTime}
        </div>
      </TableCell>

      {/* SLA */}
      <TableCell className="p-2 w-16">
        <SLABadge status={conversation.slaStatus as any} slaBreachAt={conversation.sla_breach_at} />
      </TableCell>

      {/* Status */}
      <TableCell className="p-2 w-24">
        <Badge className={cn("px-2 py-0.5 text-xs", statusColors[conversation.status])}>
          {computedValues.statusLabel}
        </Badge>
      </TableCell>

      {/* Priority */}
      <TableCell className="p-2 w-24">
        <Badge className={cn("px-2 py-0.5 text-xs", priorityColors[conversation.priority])}>
          {computedValues.priorityLabel}
        </Badge>
      </TableCell>

      {/* Actions */}
      <TableCell className="p-2 w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleToggleRead}>
              {conversation.is_read ? (
                <>
                  <MailOpen className="w-4 h-4 mr-2" />
                  {t('dashboard.conversationList.markAsUnread', 'Mark as Unread')}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  {t('dashboard.conversationList.markAsRead', 'Mark as Read')}
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />
              {t('dashboard.conversationList.archive', 'Archive')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              {t('dashboard.conversationList.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

ConversationTableRow.displayName = 'ConversationTableRow';
