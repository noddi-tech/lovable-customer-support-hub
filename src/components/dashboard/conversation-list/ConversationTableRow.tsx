import { memo, useCallback, useMemo, useRef } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, Archive, Trash2, MessageCircle, Mail, MailOpen, Globe, Clock, CheckCircle, XCircle, Reply, Lock } from 'lucide-react';
import { getConversationBrand } from '@/lib/conversationBrand';
import { BrandBadge } from './BrandBadge';
import { TagBadgeList } from '@/components/tags/TagBadge';
import { useEntityTags } from '@/hooks/useEntityTags';
import { cn } from '@/lib/utils';
import { channelIcon, channelLabel } from '@/lib/conversationChannels';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from '@/contexts/ConversationListContext';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from 'react-i18next';
import { SLABadge } from './SLABadge';
import { getCustomerDisplay, getCustomerInitial } from '@/utils/customerDisplayName';
import { useIsMobile } from '@/hooks/use-responsive';
import { useInboxEmailAddresses } from '@/hooks/useInboxEmailAddresses';
import { ConversationStatusContextMenu } from './ConversationStatusContextMenu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Small colored pill identifying which inbox a conversation belongs to.
 * Shown in the "All inboxes" view so agents always know the destination.
 */
const ConversationBrandBadge = ({
  conversation,
  compact,
}: { conversation: any; compact?: boolean }) => {
  const brand = getConversationBrand(conversation.metadata, conversation.channel);
  if (!brand) return null;
  return <BrandBadge brand={brand} compact={compact} />;
};

const InboxBadge = ({
  name,
  color,
  email,
  compact,
}: { name: string; color: string; email?: string; compact?: boolean }) => (
  <span
    title={email ? `${name} (${email})` : name}
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-1.5 py-0 max-w-full',
      compact ? 'text-[9px]' : 'text-[10px]',
    )}
    style={{ borderColor: `${color}66`, backgroundColor: `${color}14`, color }}
  >
    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
    <span className="truncate font-medium">{name}</span>
  </span>
);


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

// Channel icon + label come from the shared channel map so the Inbox row,
// the filter chips and the home dashboard always agree on naming.

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
  onBulkSelect?: (id: string, selected: boolean, shiftKey?: boolean) => void;
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
  const { dispatch, archiveConversation, toggleConversationRead, selectedInboxId } = useConversationList();
  const { conversation: formatConversationTime, dateTime: formatDateTime } = useDateFormatting();
  const { inboxes } = useOptimizedCounts();
  const { data: inboxEmails } = useInboxEmailAddresses();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { getTags } = useEntityTags('conversation');
  const conversationTags = getTags(conversation.id);

  // Only surface the inbox column/badge when the list isn't already scoped to
  // a single inbox — in the "All inboxes" view it's essential context.
  const showInboxColumn = !selectedInboxId || selectedInboxId === 'all';

  // Closed/archived threads are handled — don't keep flagging them as "New".
  const showNewBadge =
    !conversation.is_read &&
    conversation.status !== 'closed' &&
    !conversation.is_archived;



  const computedValues = useMemo(() => {
    const ChannelIcon = channelIcon(conversation.channel);
    const customerDisplay = getCustomerDisplay(
      conversation.customer?.full_name,
      conversation.customer?.email
    );
    const subjectText = conversation.subject || t('dashboard.conversation.noSubject', 'No Subject');
    const statusCfg = statusConfig[conversation.status as keyof typeof statusConfig];
    const priorityCfg = priorityConfig[conversation.priority as keyof typeof priorityConfig];
    const waitingTime = formatCompactTime(conversation.received_at || conversation.updated_at);
    const slaBorder = getSLABorderColor(conversation.slaStatus);
    const receivedRaw = conversation.received_at || conversation.updated_at;
    const inbox = conversation.inbox_id ? inboxes.find((i: any) => i.id === conversation.inbox_id) : undefined;

    return {
      ChannelIcon,
      customerName: customerDisplay.displayName,
      customerEmail: customerDisplay.showEmail ? customerDisplay.email : null,
      subjectText,
      previewText: (conversation.preview_text || '').replace(/\s+/g, ' ').trim(),
      isEmailChannel: conversation.channel === 'email',
      statusCfg,
      priorityCfg,
      waitingTime,
      slaBorder,
      customerInitial: getCustomerInitial(conversation.customer?.full_name, conversation.customer?.email),
      formattedTime: formatConversationTime(conversation.updated_at),
      // Full date + time the conversation was last received, in the user's timezone.
      receivedAt: receivedRaw ? formatDateTime(receivedRaw) : '—',
      inboxName: inbox?.name || (conversation.inbox_id ? 'Unknown inbox' : 'No inbox'),
      inboxColor: (inbox as any)?.color || '#6B7280',
      inboxEmail: conversation.inbox_id ? inboxEmails?.[conversation.inbox_id] : undefined,
    };
  }, [conversation, t, formatConversationTime, formatDateTime, inboxes, inboxEmails]);



  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    archiveConversation(conversation.id);
  }, [archiveConversation, conversation.id]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'OPEN_DELETE_DIALOG', payload: conversation.id });
  }, [dispatch, conversation.id]);

  // Remembers whether the last pointer interaction held Shift so range
  // selection works even though Radix's onCheckedChange has no event.
  const shiftKeyRef = useRef(false);

  const handleRowClick = useCallback((e: React.MouseEvent) => {
    // Cmd/Ctrl-click = toggle one row, Shift-click = select the range,
    // both work even before selection mode has been turned on explicitly.
    const modifierSelect = e.metaKey || e.ctrlKey || e.shiftKey;
    if (onBulkSelect && (showBulkCheckbox || modifierSelect)) {
      if (modifierSelect) {
        e.preventDefault();
        window.getSelection?.()?.removeAllRanges();
      }
      onBulkSelect(conversation.id, !isBulkSelected, e.shiftKey);
    } else {
      onSelect(conversation);
    }
  }, [onSelect, conversation, showBulkCheckbox, onBulkSelect, isBulkSelected]);

  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    shiftKeyRef.current = e.shiftKey;
  }, []);

  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (onBulkSelect) {
      onBulkSelect(conversation.id, checked, shiftKeyRef.current);
      shiftKeyRef.current = false;
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

  // --- Mobile card layout ---
  if (isMobile) {
    return (
      <div 
        style={style} 
        className={cn(
          "px-3 py-2.5 border-b border-border cursor-pointer active:bg-muted/70 transition-colors select-none overflow-hidden",
          style ? "flex items-center" : "min-h-[88px] flex items-center",
          isSelected && "bg-primary/8",
          isBulkSelected && "bg-primary/10",
          !conversation.is_read && "bg-primary/5"
        )} 
        onClick={handleRowClick}
      >
        <div className="flex items-start gap-3 w-full min-w-0">
          {showBulkCheckbox && (
            <div className="pt-1 shrink-0">
              <Checkbox checked={isBulkSelected} onCheckedChange={handleCheckboxChange} onClick={handleCheckboxClick} />
            </div>
          )}
          <Avatar className="h-9 w-9 ring-1 ring-border shrink-0 mt-0.5">
            <AvatarFallback className="text-xs font-medium">{computedValues.customerInitial}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            {/* Line 1: Customer name + time */}
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <span className={cn("text-sm truncate", !conversation.is_read && "font-semibold")}>
                {computedValues.customerName}
              </span>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {computedValues.waitingTime}
              </span>
            </div>
            {/* Line 2: Subject */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className={cn("text-xs truncate text-muted-foreground", !conversation.is_read && "text-foreground")}>
                {computedValues.subjectText}
              </span>
              {conversation.thread_count && conversation.thread_count > 1 && (
                <Badge variant="outline" className="px-1 py-0 text-[9px] shrink-0 border-primary/30 text-primary">
                  {conversation.thread_count}
                </Badge>
              )}
            </div>
            {/* Line 3: Status + Channel + badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {showInboxColumn && (
                <InboxBadge
                  compact
                  name={computedValues.inboxName}
                  color={computedValues.inboxColor}
                  email={computedValues.inboxEmail}
                />
              )}
              {StatusBadge}

              <div className="flex items-center gap-1 text-muted-foreground">
                <computedValues.ChannelIcon className="h-3 w-3" />
                <span className="text-[10px] capitalize">
                  {channelLabel(conversation.channel)}
                </span>
              </div>
              <ConversationBrandBadge conversation={conversation} compact />
              <TagBadgeList tags={conversationTags} compact max={2} />
              {showNewBadge && (
                <Badge className="bg-primary text-primary-foreground px-1.5 py-0 text-[9px]">New</Badge>
              )}
              {conversation.last_message_is_internal && (
                <Badge className="px-1 py-0 text-[9px] bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                  <Lock className="h-2.5 w-2.5 mr-0.5" />
                  Note
                </Badge>
              )}
              {conversation.last_message_sender_type === 'customer' && 
               !conversation.last_message_is_internal && 
               (conversation.status === 'open' || conversation.status === 'pending') && (
                <Badge variant="outline" className="px-1 py-0 text-[9px] bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                  Awaiting
                </Badge>
              )}
              {conversation.is_archived && (
                <Badge className="px-1 py-0 text-[9px] bg-muted text-muted-foreground">
                  <Archive className="h-2.5 w-2.5 mr-0.5" />
                </Badge>
              )}
              {conversation.channel === 'widget' && (conversation.metadata as any)?.chatSessionStatus === 'active' && (
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-700 animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Virtualized row (div-based) ---
  if (style) {
    return (
      <ConversationStatusContextMenu conversationId={conversation.id} status={conversation.status} brandLabel={(conversation.metadata as any)?.brand ?? (conversation.metadata as any)?.brand_name ?? null}>
      <div style={style} className={cn("flex items-center px-4 border-b", rowClasses)} onClick={handleRowClick}>
        {showBulkCheckbox && (
          <div className="w-10 p-2 shrink-0">
            <Checkbox checked={isBulkSelected} onCheckedChange={handleCheckboxChange} onClick={handleCheckboxClick} />
          </div>
        )}

        {/* Channel (icon only, first column) */}
        <div className="p-2 w-12 shrink-0 flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="relative inline-flex items-center justify-center">
                <computedValues.ChannelIcon className="h-4 w-4 text-muted-foreground" />
                {conversation.channel === 'widget' && (conversation.metadata as any)?.chatSessionStatus === 'active' && (
                  <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="right" className="capitalize">
              {channelLabel(conversation.channel)}
              {conversation.channel === 'widget' && (conversation.metadata as any)?.chatSessionStatus === 'active' && ' — live'}
            </TooltipContent>
          </Tooltip>
        </div>


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

        {/* Inbox (only in the All inboxes view) */}
        {showInboxColumn && (
          <div className="p-2 w-40 shrink-0 min-w-0">
            <InboxBadge
              name={computedValues.inboxName}
              color={computedValues.inboxColor}
              email={computedValues.inboxEmail}
            />
            {computedValues.inboxEmail && (
              <div className="text-[10px] text-muted-foreground truncate">{computedValues.inboxEmail}</div>
            )}
          </div>
        )}



        {/* Subject */}
        <div className="p-2 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {(computedValues.isEmailChannel || !computedValues.previewText) && (
              <span className="text-xs truncate">{computedValues.subjectText}</span>
            )}
            {conversation.thread_count && conversation.thread_count > 1 && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] shrink-0 border-primary/30 text-primary bg-primary/5">
                {conversation.thread_count}
              </Badge>
            )}
            {showNewBadge && (
              <Badge className="bg-blue-500 text-white px-1.5 py-0 text-[10px] shrink-0">New</Badge>
            )}
            {conversation.last_message_is_internal && (
              <Badge className="px-1.5 py-0 text-[10px] shrink-0 bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                <Lock className="h-3 w-3 mr-0.5" />
                Note
              </Badge>
            )}
            {conversation.last_message_sender_type === 'customer' && 
             !conversation.last_message_is_internal && 
             (conversation.status === 'open' || conversation.status === 'pending') && (
              <Badge variant="outline" className="px-1.5 py-0 text-[10px] shrink-0 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                <Clock className="h-3 w-3 mr-0.5" />
                Awaiting reply
              </Badge>
            )}
            <TagBadgeList tags={conversationTags} compact max={3} className="shrink-0" />
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
          {computedValues.previewText && (
            <div
              className={cn(
                'text-[11px] text-muted-foreground leading-snug',
                computedValues.isEmailChannel ? 'line-clamp-1' : 'line-clamp-2',
              )}
            >
              {computedValues.previewText}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="p-2 w-32 shrink-0 flex items-center gap-1">
          {StatusBadge}
          {conversation.is_archived && (
            <Badge className="px-1.5 py-0 text-[10px] bg-muted text-muted-foreground">
              <Archive className="h-3 w-3 mr-0.5" />
              Archived
            </Badge>
          )}
        </div>

        {/* Priority */}
        <div className="p-2 w-24 shrink-0">{PriorityBadge}</div>

        {/* Received */}
        <div className="p-2 w-36 shrink-0">
          <span className="text-xs text-muted-foreground truncate block" title={computedValues.receivedAt}>
            {computedValues.receivedAt}
          </span>
        </div>

        {/* Waiting */}

        <div className="p-2 w-20 shrink-0">
          <span className="text-xs text-muted-foreground">{computedValues.waitingTime}</span>
        </div>

        {/* SLA */}
        <div className="p-2 w-28 shrink-0">
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
      </ConversationStatusContextMenu>
    );
  }

  // --- Standard table row ---
  return (
    <ConversationStatusContextMenu conversationId={conversation.id} status={conversation.status} brandLabel={(conversation.metadata as any)?.brand ?? (conversation.metadata as any)?.brand_name ?? null}>
    <TableRow className={rowClasses} onClick={handleRowClick}>
      {showBulkCheckbox && (
        <TableCell className="w-10 p-2">
          <Checkbox checked={isBulkSelected} onCheckedChange={handleCheckboxChange} onClick={handleCheckboxClick} />
        </TableCell>
      )}

      {/* Channel (icon only, first column) */}
      <TableCell className="p-2 w-12">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="relative inline-flex items-center justify-center">
              <computedValues.ChannelIcon className="h-4 w-4 text-muted-foreground" />
              {conversation.channel === 'widget' && (conversation.metadata as any)?.chatSessionStatus === 'active' && (
                <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent side="right" className="capitalize">
            {channelLabel(conversation.channel)}
            {conversation.channel === 'widget' && (conversation.metadata as any)?.chatSessionStatus === 'active' && ' — live'}
          </TooltipContent>
        </Tooltip>
      </TableCell>

      {/* Customer */}
      <TableCell className="p-2 w-48">

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

      {/* Inbox (only in the All inboxes view) */}
      {showInboxColumn && (
        <TableCell className="p-2 w-40">
          <div className="min-w-0">
            <InboxBadge
              name={computedValues.inboxName}
              color={computedValues.inboxColor}
              email={computedValues.inboxEmail}
            />
            {computedValues.inboxEmail && (
              <div className="text-[10px] text-muted-foreground truncate">{computedValues.inboxEmail}</div>
            )}
          </div>
        </TableCell>
      )}



      {/* Subject */}
      <TableCell className="p-2">
        <div className="flex items-center gap-2">
          {(computedValues.isEmailChannel || !computedValues.previewText) && (
            <span className="text-xs truncate">{computedValues.subjectText}</span>
          )}
          {conversation.thread_count && conversation.thread_count > 1 && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] shrink-0 border-primary/30 text-primary bg-primary/5">
              {conversation.thread_count}
            </Badge>
          )}
          {showNewBadge && (
            <Badge className="bg-blue-500 text-white px-1.5 py-0 text-[10px] shrink-0">New</Badge>
          )}
          {conversation.last_message_is_internal && (
            <Badge className="px-1.5 py-0 text-[10px] shrink-0 bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
              <Lock className="h-3 w-3 mr-0.5" />
              Note
            </Badge>
          )}
          {conversation.last_message_sender_type === 'customer' && 
           !conversation.last_message_is_internal && 
           (conversation.status === 'open' || conversation.status === 'pending') && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] shrink-0 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
              <Clock className="h-3 w-3 mr-0.5" />
              Awaiting reply
            </Badge>
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
        {computedValues.previewText && (
          <div
            className={cn(
              'text-[11px] text-muted-foreground leading-snug',
              computedValues.isEmailChannel ? 'line-clamp-1' : 'line-clamp-2',
            )}
          >
            {computedValues.previewText}
          </div>
        )}
      </TableCell>

      {/* Status */}
      <TableCell className="p-2 w-32">
        <div className="flex items-center gap-1">
          {StatusBadge}
          {conversation.is_archived && (
            <Badge className="px-1.5 py-0 text-[10px] shrink-0 bg-muted text-muted-foreground">
              <Archive className="h-3 w-3 mr-0.5" />
              Archived
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Priority */}
      <TableCell className="p-2 w-24">{PriorityBadge}</TableCell>

      {/* Received */}
      <TableCell className="p-2 w-36">
        <span className="text-xs text-muted-foreground whitespace-nowrap" title={computedValues.receivedAt}>
          {computedValues.receivedAt}
        </span>
      </TableCell>

      {/* Waiting */}

      <TableCell className="p-2 w-20">
        <span className="text-xs text-muted-foreground">{computedValues.waitingTime}</span>
      </TableCell>

      {/* SLA */}
      <TableCell className="p-2 w-28">
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
    </ConversationStatusContextMenu>
  );
});

ConversationTableRow.displayName = 'ConversationTableRow';
