import { memo, useCallback, useMemo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, Trash2, MessageCircle, Mail, MailOpen, Globe, Clock, CheckCircle, XCircle, Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from 'react-i18next';
import { SLABadge } from './SLABadge';
import { getCustomerDisplay, getCustomerInitial } from '@/utils/customerDisplayName';

// --- Visual config maps ---

const priorityConfig = {
  low: { label: 'Low', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
  normal: { label: 'Normal', className: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' },
  high: { label: 'High', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  urgent: { label: 'Urgent', className: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
};

const statusConfig = {
  open: { icon: MessageCircle, label: 'Open', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
  pending: { icon: Clock, label: 'Pending', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' },
  resolved: { icon: CheckCircle, label: 'Resolved', className: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' },
  closed: { icon: XCircle, label: 'Closed', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

const channelIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  email: MessageCircle,
  chat: MessageCircle,
  widget: Globe,
  social: MessageCircle,
  facebook: MessageCircle,
  instagram: MessageCircle,
  whatsapp: MessageCircle,
};

// --- Utilities ---

function getSLABorderColor(slaStatus?: string): string {
  if (slaStatus === 'breached') return 'border-l-4 border-l-red-500';
  if (slaStatus === 'at_risk') return 'border-l-4 border-l-amber-500';
  if (slaStatus === 'on_track') return 'border-l-4 border-l-emerald-500';
  return '';
}

function formatCompactTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const absDiff = Math.abs(diffMs);

    if (absDiff < 60000) return '<1m';
    if (absDiff < 3600000) return `${Math.round(absDiff / 60000)}m`;
    if (absDiff < 86400000) return `${Math.round(absDiff / 3600000)}h`;
    return `${Math.round(absDiff / 86400000)}d`;
  } catch {
    return '-';
  }
}

// --- Component ---

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
    const customerDisplay = getCustomerDisplay(
      conversation.customer?.full_name,
      conversation.customer?.email
    );
    const subjectText = conversation.subject || t('dashboard.conversation.noSubject', 'No Subject');
    const statusCfg = statusConfig[conversation.status as keyof typeof statusConfig];
    const priorityCfg = priorityConfig[conversation.priority as keyof typeof priorityConfig];
    const waitingTime = formatCompactTime(conversation.received_at || conversation.updated_at);
    const slaBorder = getSLABorderColor(conversation.slaStatus);

    return {
      ChannelIcon,
      customerName: customerDisplay.displayName,
      customerEmail: customerDisplay.showEmail ? customerDisplay.email : null,
      subjectText,
      statusCfg,
      priorityCfg,
      waitingTime,
      slaBorder,
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

  const handleReply = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(conversation);
  }, [onSelect, conversation]);

  // Status badge with icon
  const StatusBadge = useMemo(() => {
    const cfg = computedValues.statusCfg;
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
      <Badge className={cn("px-2 py-0.5 text-[10px] flex items-center gap-1", cfg.className)}>
        <Icon className="w-3 h-3" />
        {t(`conversation.${conversation.status}`, cfg.label)}
      </Badge>
    );
  }, [computedValues.statusCfg, conversation.status, t]);

  // Priority badge
  const PriorityBadge = useMemo(() => {
    const cfg = computedValues.priorityCfg;
    if (!cfg) return null;
    return (
      <Badge className={cn("px-2 py-0.5 text-[10px]", cfg.className)}>
        {t(`conversation.${conversation.priority}`, cfg.label)}
      </Badge>
    );
  }, [computedValues.priorityCfg, conversation.priority, t]);

  const rowClasses = cn(
    "group cursor-pointer hover:bg-muted/50 transition-colors",
    computedValues.slaBorder,
    isSelected && !showBulkCheckbox && "bg-primary/8",
    isBulkSelected && "bg-primary/10",
    !conversation.is_read && "font-semibold"
  );

  // --- Virtualized row (div-based) ---
  if (style) {
    return (
      <div style={style} className={cn("flex items-center px-4 border-b", rowClasses)} onClick={handleRowClick}>
        {showBulkCheckbox && (
          <div className="w-10 p-2 shrink-0">
            <Checkbox checked={isBulkSelected} onCheckedChange={handleCheckboxChange} onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Customer */}
        <div className="p-2 w-48 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-6 w-6 ring-1 ring-muted shrink-0">
              <AvatarFallback className="text-xs">{computedValues.customerInitial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs truncate">{computedValues.customerName}</div>
              {computedValues.customerEmail && (
                <div className="text-[10px] text-muted-foreground truncate hidden xl:block">{computedValues.customerEmail}</div>
              )}
            </div>
          </div>
        </div>

        {/* Subject */}
        <div className="p-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs truncate">{computedValues.subjectText}</span>
            {conversation.thread_count && conversation.thread_count > 1 && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] shrink-0 border-primary/30 text-primary bg-primary/5">
                {conversation.thread_count}
              </Badge>
            )}
            {!conversation.is_read && (
              <Badge className="bg-blue-500 text-white px-1.5 py-0 text-[10px] shrink-0">New</Badge>
            )}
            {/* Hover reply button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={handleReply}
            >
              <Reply className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="p-2 w-24 shrink-0">{StatusBadge}</div>

        {/* Priority */}
        <div className="p-2 w-24 shrink-0">{PriorityBadge}</div>

        {/* Channel */}
        <div className="p-2 w-28 shrink-0">
          <div className="flex items-center gap-1.5">
            <computedValues.ChannelIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">
              {conversation.channel === 'widget' ? 'Chat' : conversation.channel}
            </span>
            {conversation.channel === 'widget' && conversation.status === 'open' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 animate-pulse">
                LIVE
              </Badge>
            )}
          </div>
        </div>

        {/* Waiting */}
        <div className="p-2 w-20 shrink-0">
          <span className="text-xs text-muted-foreground">{computedValues.waitingTime}</span>
        </div>

        {/* SLA */}
        <div className="p-2 w-20 shrink-0">
          <SLABadge status={conversation.slaStatus as any} slaBreachAt={conversation.sla_breach_at} />
        </div>

        {/* Actions - visible on hover */}
        <div className="p-2 w-12 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleToggleRead}>
                {conversation.is_read ? (<><MailOpen className="w-4 h-4 mr-2" />{t('dashboard.conversationList.markAsUnread', 'Mark as Unread')}</>) : (<><Mail className="w-4 h-4 mr-2" />{t('dashboard.conversationList.markAsRead', 'Mark as Read')}</>)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive}>
                <Archive className="w-4 h-4 mr-2" />{t('dashboard.conversationList.archive', 'Archive')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />{t('dashboard.conversationList.delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // --- Standard table row ---
  return (
    <TableRow className={rowClasses} onClick={handleRowClick}>
      {showBulkCheckbox && (
        <TableCell className="w-10 p-2">
          <Checkbox checked={isBulkSelected} onCheckedChange={handleCheckboxChange} onClick={(e) => e.stopPropagation()} />
        </TableCell>
      )}

      {/* Customer */}
      <TableCell className="p-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="h-6 w-6 ring-1 ring-muted shrink-0">
            <AvatarFallback className="text-xs">{computedValues.customerInitial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-xs truncate">{computedValues.customerName}</div>
            {computedValues.customerEmail && (
              <div className="text-[10px] text-muted-foreground truncate hidden xl:block">{computedValues.customerEmail}</div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Subject */}
      <TableCell className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-xs truncate">{computedValues.subjectText}</span>
          {conversation.thread_count && conversation.thread_count > 1 && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] shrink-0 border-primary/30 text-primary bg-primary/5">
              {conversation.thread_count}
            </Badge>
          )}
          {!conversation.is_read && (
            <Badge className="bg-blue-500 text-white px-1.5 py-0 text-[10px] shrink-0">New</Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={handleReply}
          >
            <Reply className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="p-2 w-24">{StatusBadge}</TableCell>

      {/* Priority */}
      <TableCell className="p-2 w-24">{PriorityBadge}</TableCell>

      {/* Channel */}
      <TableCell className="p-2 w-28">
        <div className="flex items-center gap-1.5">
          <computedValues.ChannelIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">
            {conversation.channel === 'widget' ? 'Chat' : conversation.channel}
          </span>
          {conversation.channel === 'widget' && conversation.status === 'open' && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Waiting */}
      <TableCell className="p-2 w-20">
        <span className="text-xs text-muted-foreground">{computedValues.waitingTime}</span>
      </TableCell>

      {/* SLA */}
      <TableCell className="p-2 w-20">
        <SLABadge status={conversation.slaStatus as any} slaBreachAt={conversation.sla_breach_at} />
      </TableCell>

      {/* Actions */}
      <TableCell className="p-2 w-12 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleToggleRead}>
              {conversation.is_read ? (<><MailOpen className="w-4 h-4 mr-2" />{t('dashboard.conversationList.markAsUnread', 'Mark as Unread')}</>) : (<><Mail className="w-4 h-4 mr-2" />{t('dashboard.conversationList.markAsRead', 'Mark as Read')}</>)}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchive}>
              <Archive className="w-4 h-4 mr-2" />{t('dashboard.conversationList.archive', 'Archive')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />{t('dashboard.conversationList.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

ConversationTableRow.displayName = 'ConversationTableRow';
