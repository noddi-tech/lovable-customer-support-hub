import React, { memo, useMemo, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, Trash2, Clock, MessageCircle, User, Mail, MailOpen, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from "react-i18next";
import { SLABadge } from './SLABadge';
import { stripHtml } from '@/utils/stripHtml';
import { PresenceAvatarStack } from '@/components/conversations/PresenceAvatarStack';

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
  widget: Globe,
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
  const { dispatch, archiveConversation, toggleConversationRead } = useConversationList();
  const { conversation: formatConversationTime } = useDateFormatting();
  const { inboxes } = useOptimizedCounts();
  const { t } = useTranslation();

  // Memoize computed values to prevent recalculation
  const computedValues = useMemo(() => {
    // Check if this is a live chat conversation (widget channel with active session)
    const isLiveChat = (conversation.channel as string) === 'widget' && 
      (conversation as any).metadata?.chatSessionStatus === 'active';
    
    return {
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
      previewText: stripHtml(conversation.preview_text) || 'No preview available',
      isLiveChat,
    };
  }, [
    conversation.channel,
    conversation.snooze_until,
    conversation.customer?.full_name,
    conversation.customer?.email,
    conversation.status,
    conversation.priority,
    conversation.subject,
    conversation.updated_at,
    conversation.preview_text,
    (conversation as any).metadata,
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
    
    // In bulk selection mode, clicking the card should toggle checkbox selection
    if (showBulkCheckbox && onBulkSelect) {
      onBulkSelect(conversation.id, !isBulkSelected);
    } else {
      // In normal mode, clicking opens the conversation
      onSelect(conversation);
    }
  }, [onSelect, conversation, showBulkCheckbox, onBulkSelect, conversation.id, isBulkSelected]);

  const handleDropdownClick = useCallback((e: React.MouseEvent) => {
    console.log('Dropdown trigger clicked');
    e.stopPropagation();
  }, []);

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
    <div
      className={cn(
        "bg-white border border-border rounded-lg px-3 py-2",
        isVirtualized ? "mb-0" : "mb-1",
        "shadow-sm hover:shadow-sm transition-all duration-200 cursor-pointer",
        showBulkCheckbox && "hover:border-primary/50",
        isSelected && !showBulkCheckbox && "border-primary shadow-md",
        isBulkSelected && "border-primary bg-primary/5 shadow-md ring-2 ring-primary/30",
        !conversation.is_read && !isBulkSelected && "ring-2 ring-primary/20"
      )}
      onClick={handleSelect}
    >
      {/* Single horizontal row with all content */}
      <div className="flex items-center gap-2.5">
        {showBulkCheckbox && (
          <Checkbox
            checked={isBulkSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}
        
        <Avatar className="h-7 w-7 ring-1 ring-muted shrink-0">
          <AvatarFallback className="text-xs font-semibold">
            {computedValues.customerInitial}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-semibold text-sm truncate">
            {computedValues.customerName}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-sm truncate flex-1">
            {computedValues.subjectText}
          </span>
          {!conversation.is_read && (
            <Badge className="bg-blue-500 text-white px-1.5 py-0 text-xs shrink-0">
              Unread
            </Badge>
          )}
          {computedValues.isLiveChat && (
            <Badge className="bg-green-500 text-white px-1.5 py-0 text-xs shrink-0 animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Presence Avatars - show who's viewing this conversation */}
          <PresenceAvatarStack 
            conversationId={conversation.id} 
            size="sm"
            maxAvatars={2}
          />
          <SLABadge status={conversation.slaStatus as any} slaBreachAt={conversation.sla_breach_at} />
          <Badge className={cn("px-1.5 py-0 text-xs", statusColors[conversation.status])}>
            {computedValues.statusLabel}
          </Badge>
          <Badge className={cn("px-1.5 py-0 text-xs", priorityColors[conversation.priority])}>
            {computedValues.priorityLabel}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0"
                onClick={handleDropdownClick}
              >
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
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span className="flex items-center gap-1">
              <computedValues.ChannelIcon className="h-3 w-3" />
              {conversation.channel}
            </span>
            <div className="flex items-center gap-1">
              <div 
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: computedValues.inboxColor }}
              />
              <span className="truncate max-w-[100px]">{computedValues.inboxName}</span>
            </div>
            <span className="font-medium">
              {computedValues.formattedTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
