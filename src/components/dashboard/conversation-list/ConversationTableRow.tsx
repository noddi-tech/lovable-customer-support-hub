import { memo, useCallback, useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, Trash2, MessageCircle, Mail, MailOpen, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from 'react-i18next';
import { SLABadge } from './SLABadge';
import { formatDistanceToNow } from 'date-fns';
import { getCustomerDisplay, getCustomerInitial } from '@/utils/customerDisplayName';

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

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  email: MessageCircle,
  chat: MessageCircle,
  widget: Globe,  // Widget/live chat gets Globe icon
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
    
    // Use smart display logic to prevent duplicate email display
    const customerDisplay = getCustomerDisplay(
      conversation.customer?.full_name,
      conversation.customer?.email
    );
    
    const subjectText = conversation.subject || t('dashboard.conversation.noSubject', 'No Subject');
    const statusLabel = t(`conversation.${conversation.status}`, conversation.status);
    const priorityLabel = t(`conversation.${conversation.priority}`, conversation.priority);
    
    // Calculate waiting time - use received_at (when last message arrived) instead of updated_at
    // This shows actual customer activity time, not internal field changes
    const waitingTime = (conversation.received_at || conversation.updated_at)
      ? formatDistanceToNow(new Date(conversation.received_at || conversation.updated_at), { addSuffix: false })
      : '-';

    return {
      ChannelIcon,
      customerName: customerDisplay.displayName,
      customerEmail: customerDisplay.showEmail ? customerDisplay.email : null,
      subjectText,
      statusLabel,
      priorityLabel,
      waitingTime,
      customerInitial: getCustomerInitial(conversation.customer?.full_name, conversation.customer?.email),
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

  // When virtualized (style prop present), render as div
  if (style) {
    return (
      <div
        style={style}
        className={cn(
          "flex items-center px-4 border-b cursor-pointer hover:bg-muted/50 transition-colors",
          isSelected && !showBulkCheckbox && "bg-primary/5",
          isBulkSelected && "bg-primary/10",
          !conversation.is_read && "font-semibold"
        )}
        onClick={handleRowClick}
      >
        {/* Checkbox */}
        {showBulkCheckbox && (
          <div className="w-10 p-2 shrink-0">
            <Checkbox
              checked={isBulkSelected}
              onCheckedChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Customer */}
        <div className="p-2 w-48 shrink-0">
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
        </div>

        {/* Conversation (Subject) */}
        <div className="p-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm truncate">{computedValues.subjectText}</span>
            {conversation.thread_count && conversation.thread_count > 1 && (
              <Badge variant="outline" className="px-1.5 py-0 text-xs shrink-0 border-primary/30 text-primary bg-primary/5">
                {conversation.thread_count}
              </Badge>
            )}
            {!conversation.is_read && (
              <Badge className="bg-blue-500 text-white px-1.5 py-0 text-xs shrink-0">
                New
              </Badge>
            )}
          </div>
        </div>

        {/* Channel - with special LIVE badge for widget/chat */}
        <div className="p-2 w-28 shrink-0">
          <div className="flex items-center gap-1.5">
            <computedValues.ChannelIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">
              {conversation.channel === 'widget' ? 'Chat' : conversation.channel}
            </span>
            {/* Pulsing LIVE badge for active widget sessions */}
            {conversation.channel === 'widget' && conversation.status === 'open' && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700 animate-pulse"
              >
                LIVE
              </Badge>
            )}
          </div>
        </div>

        {/* Waiting Time */}
        <div className="p-2 w-24 shrink-0">
          <div className="text-xs text-muted-foreground">
            {computedValues.waitingTime}
          </div>
        </div>

        {/* SLA */}
        <div className="p-2 w-16 shrink-0">
          <SLABadge status={conversation.slaStatus as any} slaBreachAt={conversation.sla_breach_at} />
        </div>

        {/* Status */}
        <div className="p-2 w-24 shrink-0">
          <Badge className={cn("px-2 py-0.5 text-xs", statusColors[conversation.status])}>
            {computedValues.statusLabel}
          </Badge>
        </div>

        {/* Priority */}
        <div className="p-2 w-24 shrink-0">
          <Badge className={cn("px-2 py-0.5 text-xs", priorityColors[conversation.priority])}>
            {computedValues.priorityLabel}
          </Badge>
        </div>

        {/* Actions */}
        <div className="p-2 w-12 shrink-0">
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
        </div>
      </div>
    );
  }

  // When not virtualized, use table elements
  return (
    <TableRow
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
          {conversation.thread_count && conversation.thread_count > 1 && (
            <Badge variant="outline" className="px-1.5 py-0 text-xs shrink-0 border-primary/30 text-primary bg-primary/5">
              {conversation.thread_count}
            </Badge>
          )}
          {!conversation.is_read && (
            <Badge className="bg-blue-500 text-white px-1.5 py-0 text-xs shrink-0">
              New
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Channel - with special LIVE badge for widget/chat */}
      <TableCell className="p-2 w-28">
        <div className="flex items-center gap-1.5">
          <computedValues.ChannelIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">
            {conversation.channel === 'widget' ? 'Chat' : conversation.channel}
          </span>
          {/* Pulsing LIVE badge for active widget sessions */}
          {conversation.channel === 'widget' && conversation.status === 'open' && (
            <Badge 
              variant="outline" 
              className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700 animate-pulse"
            >
              LIVE
            </Badge>
          )}
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
