import React, { memo, useMemo, useCallback } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Archive, Trash2, Star, Clock, MessageCircle, MoreVertical, Inbox, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from "react-i18next";
import { ResponsiveFlex, AdaptiveSection } from '@/components/admin/design/components/layouts';

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
}

export const ConversationListItem = memo<ConversationListItemProps>(({ conversation, isSelected, onSelect }) => {
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
    inboxColor: conversation.inbox_id ? inboxes.find(i => i.id === conversation.inbox_id)?.color || '#6B7280' : '#6B7280'
  }), [
    conversation.channel,
    conversation.snooze_until,
    conversation.customer?.full_name,
    conversation.customer?.email,
    conversation.status,
    conversation.priority,
    conversation.subject,
    conversation.updated_at,
    t,
    formatConversationTime
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

  // Memoize CSS classes
  const desktopClasses = useMemo(() => cn(
    "hidden md:block cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/30",
    isSelected && "bg-accent border-primary/20",
    !conversation.is_read && "bg-accent/30"
  ), [isSelected, conversation.is_read]);

  const mobileClasses = useMemo(() => cn(
    "block md:hidden cursor-pointer border border-border/30 rounded-lg p-3 mb-2 bg-card hover:bg-accent/50 transition-colors",
    isSelected && "border-primary bg-accent",
    !conversation.is_read && "bg-accent/30"
  ), [isSelected, conversation.is_read]);

  return (
    <>
      {/* Desktop Layout - Ticket Format */}
      <div
        className={desktopClasses}
        onClick={handleSelect}
      >
        <AdaptiveSection padding="3" spacing="1" className="py-2.5">
          {/* Row 1: Customer + Status/Priority badges + Time + Menu */}
          <ResponsiveFlex alignment="center" justify="between">
            <ResponsiveFlex alignment="center" gap="2">
              <span className="font-medium text-sm">
                {computedValues.customerName}
              </span>
              <Badge 
                className={cn("text-xs px-1.5 py-0.5 h-4", statusColors[conversation.status])}
              >
                {computedValues.statusLabel}
              </Badge>
              <Badge 
                className={cn("text-xs px-1.5 py-0.5 h-4", priorityColors[conversation.priority])}
              >
                {computedValues.priorityLabel}
              </Badge>
            </ResponsiveFlex>
            
            <ResponsiveFlex alignment="center" gap="2">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium">Waiting:</span> {computedValues.formattedTime}
              </span>
              {!conversation.is_read && (
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={handleDropdownClick}
                  >
                    <MoreHorizontal className="h-3 w-3" />
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
            </ResponsiveFlex>
          </ResponsiveFlex>
          
          {/* Row 2: Subject */}
          <div className="font-semibold text-sm truncate">
            {computedValues.subjectText}
          </div>
          
          {/* Row 3: Preview Text */}
          <div className="text-xs text-muted-foreground truncate">
            {conversation.preview_text || 'No preview available'}
          </div>
          
          {/* Row 4: Receiving Email + Channel + Tags */}
          <ResponsiveFlex alignment="center" justify="between">
            <ResponsiveFlex alignment="center" gap="2">
              <span className="text-xs text-muted-foreground">
                {computedValues.customerEmail ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <User className="w-3 h-3" />
                      From:
                    </span>{' '}
                    {computedValues.customerEmail}
                  </>
                ) : 'No email'}
              </span>
              {/* Inbox Indicator */}
              <div className="flex items-center gap-1">
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: computedValues.inboxColor }}
                />
                <span className="text-xs text-muted-foreground">
                  {computedValues.inboxName}
                </span>
              </div>
            </ResponsiveFlex>
            
            <ResponsiveFlex alignment="center" gap="2">
              <ResponsiveFlex alignment="center" gap="1">
                <computedValues.ChannelIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
              </ResponsiveFlex>
              
              {computedValues.isSnoozed && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-3.5">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {t('conversation.snoozed', 'Snoozed')}
                </Badge>
              )}
            </ResponsiveFlex>
          </ResponsiveFlex>
        </AdaptiveSection>
      </div>

      {/* Mobile Layout - Ticket Format */}
      <div
        className={mobileClasses}
        onClick={handleSelect}
      >
        <AdaptiveSection spacing="1.5">
          {/* Row 1: Customer + Badges + Time + Menu */}
          <ResponsiveFlex alignment="center" justify="between">
            <ResponsiveFlex alignment="center" gap="1.5">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {computedValues.customerInitial}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">
                {computedValues.customerName}
              </span>
              <Badge className={cn("text-xs px-1 py-0 h-3.5", statusColors[conversation.status])}>
                {computedValues.statusLabel}
              </Badge>
              <Badge className={cn("text-xs px-1 py-0 h-3.5", priorityColors[conversation.priority])}>
                {computedValues.priorityLabel}
              </Badge>
            </ResponsiveFlex>
            
            <ResponsiveFlex alignment="center" gap="1">
              <span className="text-xs text-muted-foreground">
                <span className="font-medium">Waiting:</span> {computedValues.formattedTime}
              </span>
              {!conversation.is_read && (
                <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0"
                    onClick={handleDropdownClick}
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ResponsiveFlex>
          </ResponsiveFlex>
          
          {/* Row 2: Subject */}
          <div className="font-semibold text-sm truncate pl-7">
            {computedValues.subjectText}
          </div>
          
          {/* Row 3: Preview Text */}
          <div className="text-xs text-muted-foreground truncate pl-7">
            {conversation.preview_text || 'No preview available'}
          </div>
          
          {/* Row 4: Receiving Email + Channel + Tags */}
          <ResponsiveFlex alignment="center" justify="between" className="pl-7">
            <ResponsiveFlex alignment="center" gap="2">
              <span className="text-xs text-muted-foreground">
                {computedValues.customerEmail ? (
                  <>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      <User className="w-3 h-3" />
                      From:
                    </span>{' '}
                    {computedValues.customerEmail}
                  </>
                ) : 'No email'}
              </span>
              {/* Inbox Indicator */}
              <div className="flex items-center gap-1">
                <div 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: computedValues.inboxColor }}
                />
                <span className="text-xs text-muted-foreground">
                  {computedValues.inboxName}
                </span>
              </div>
            </ResponsiveFlex>
            
            <ResponsiveFlex alignment="center" gap="2">
              <ResponsiveFlex alignment="center" gap="1">
                <computedValues.ChannelIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
              </ResponsiveFlex>
              
              {computedValues.isSnoozed && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-3.5">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {t('conversation.snoozed', 'Snoozed')}
                </Badge>
              )}
            </ResponsiveFlex>
          </ResponsiveFlex>
        </AdaptiveSection>
      </div>
    </>
  );
});