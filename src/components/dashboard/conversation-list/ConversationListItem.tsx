import React, { memo, useMemo, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, Trash2, Clock, MessageCircle, User, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from "react-i18next";
import { SLABadge } from './SLABadge';
import { stripHtml } from '@/utils/stripHtml';

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

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: (conversation: Conversation) => void;
  isBulkSelected?: boolean;
  onBulkSelect?: (id: string, selected: boolean) => void;
  showBulkCheckbox?: boolean;
  isVirtualized?: boolean;
}

export const ConversationListItem = memo<ConversationListItemProps>(({ 
  conversation, 
  isSelected, 
  onSelect, 
  isBulkSelected = false,
  onBulkSelect,
  showBulkCheckbox = false,
  isVirtualized = false
}) => {
  const { dispatch, archiveConversation } = useConversationList();
  const { conversation: formatConversationTime } = useDateFormatting();
  const { inboxes } = useOptimizedCounts();
  const { t } = useTranslation();

  // Memoize computed values to prevent recalculation
  const computedValues = useMemo(() => ({
    ChannelIcon: channelIcons[conversation.channel] || MessageCircle,
    isSnoozed: conversation.snooze_until && new Date(conversation.snooze_until) > new Date(),
    customerName: conversation.customer?.full_name || 'Unknown',
    customerEmail: conversation.customer?.email,
    statusLabel: t(`conversation.${conversation.status}`, conversation.status),
    priorityLabel: t(`conversation.${conversation.priority}`, conversation.priority),
    subjectText: conversation.subject || t('dashboard.conversation.noSubject', 'No Subject'),
    formattedTime: formatConversationTime(conversation.updated_at),
    customerInitial: conversation.customer?.full_name?.[0] || 'C',
    inboxName: conversation.inbox_id ? inboxes.find(i => i.id === conversation.inbox_id)?.name || 'Unknown Inbox' : 'No Inbox',
    inboxColor: conversation.inbox_id ? inboxes.find(i => i.id === conversation.inbox_id)?.color || '#6B7280' : '#6B7280',
    // Strip HTML from preview text as a safety measure (database should already handle this)
    previewText: stripHtml(conversation.preview_text) || 'No preview available'
  }), [
    conversation.channel,
    conversation.snooze_until,
    conversation.customer?.full_name,
    conversation.customer?.email,
    conversation.status,
    conversation.priority,
    conversation.subject,
    conversation.updated_at,
    conversation.preview_text,
    t,
    formatConversationTime,
    conversation.inbox_id,
    inboxes
  ]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleArchive = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    archiveConversation(conversation.id);
  }, [archiveConversation, conversation.id]);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'OPEN_DELETE_DIALOG', payload: conversation.id });
  }, [dispatch, conversation.id]);

  const handleSelect = useCallback((e: React.MouseEvent) => {
    console.log('Click handler called:', conversation.id);
    onSelect(conversation);
  }, [onSelect, conversation]);

  const handleDropdownClick = useCallback((e: React.MouseEvent) => {
    console.log('Dropdown trigger clicked');
    e.stopPropagation();
  }, []);

  const handleCheckboxChange = useCallback((checked: boolean) => {
    if (onBulkSelect) {
      onBulkSelect(conversation.id, checked);
    }
  }, [onBulkSelect, conversation.id]);

  return (
    <div
      className={cn(
        "bg-white border border-border rounded-lg p-4",
        isVirtualized ? "mb-0" : "mb-3",
        "shadow-sm hover:shadow-md hover:border-primary/30",
        "transition-all duration-200 cursor-pointer",
        isSelected && "border-primary shadow-md",
        !conversation.is_read && "ring-2 ring-primary/20"
      )}
      onClick={handleSelect}
    >
      {/* Row 1: Avatar + Name + Unread Badge + Status/Priority + Menu */}
      <div className="flex items-center gap-3 mb-2">
        {showBulkCheckbox && (
          <Checkbox
            checked={isBulkSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}
        
        <Avatar className="h-10 w-10 ring-2 ring-muted shrink-0">
          <AvatarFallback className="text-base font-semibold">
            {computedValues.customerInitial}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-base truncate">
              {computedValues.customerName}
            </span>
            {!conversation.is_read && (
              <Badge className="bg-blue-500 text-white px-2 py-0.5">
                Unread
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <SLABadge status={conversation.slaStatus as any} slaBreachAt={conversation.sla_breach_at} />
          <Badge className={cn("px-2.5 py-1", statusColors[conversation.status])}>
            {computedValues.statusLabel}
          </Badge>
          <Badge className={cn("px-2.5 py-1", priorityColors[conversation.priority])}>
            {computedValues.priorityLabel}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
                onClick={handleDropdownClick}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      
      {/* Row 2: Subject (bold and prominent) */}
      <h4 className="font-semibold text-sm mb-1 truncate">
        {computedValues.subjectText}
      </h4>
      
      {/* Row 3: Preview (better contrast) */}
      <p className="text-sm text-foreground/70 line-clamp-2 mb-2">
        {computedValues.previewText}
      </p>
      
      {/* Row 4: Metadata */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3 text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5" />
            {computedValues.customerEmail || 'No email'}
          </span>
          <span className="flex items-center gap-1">
            <computedValues.ChannelIcon className="h-3.5 w-3.5" />
            {conversation.channel}
          </span>
          <div className="flex items-center gap-1">
            <div 
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: computedValues.inboxColor }}
            />
            <span>{computedValues.inboxName}</span>
          </div>
        </div>
        <span className="font-medium text-muted-foreground">
          Waiting: {computedValues.formattedTime}
        </span>
      </div>
    </div>
  );
});
