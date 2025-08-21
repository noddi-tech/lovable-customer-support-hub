import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Archive, Trash2, Star, Clock, MessageCircle, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { useConversationList, type Conversation } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";

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

export const ConversationListItem = ({ conversation, isSelected, onSelect }: ConversationListItemProps) => {
  const { dispatch, archiveConversation } = useConversationList();
  const { conversation: formatConversationTime } = useDateFormatting();
  const { t } = useTranslation();

  const ChannelIcon = channelIcons[conversation.channel] || MessageCircle;
  const isSnoozed = conversation.snooze_until && new Date(conversation.snooze_until) > new Date();

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    archiveConversation(conversation.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'OPEN_DELETE_DIALOG', payload: conversation.id });
  };

  return (
    <>
      {/* Desktop Layout */}
      <div
        className={cn(
          "hidden md:block cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/30",
          isSelected && "bg-accent border-primary/20",
          !conversation.is_read && "bg-accent/30"
        )}
        onClick={(e) => {
          console.log('Desktop click handler called:', conversation.id);
          onSelect(conversation);
        }}
      >
        <div className="px-3 py-2">
          {/* Row 1: From, Subject, Date */}
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-2 min-w-0">
              <div className="font-medium text-sm truncate">
                {conversation.customer?.full_name || 'Unknown'}
              </div>
            </div>
            <div className="flex-3 min-w-0">
              <div className="text-sm text-muted-foreground truncate">
                {conversation.subject || t('dashboard.conversation.noSubject')}
              </div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {formatConversationTime(conversation.updated_at)}
              {!conversation.is_read && (
                <div className="w-1.5 h-1.5 bg-primary rounded-full ml-2 inline-block"></div>
              )}
            </div>
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      console.log('Desktop dropdown trigger clicked');
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleArchive(e);
                  }}>
                    <Archive className="w-4 h-4 mr-2" />
                    {t('dashboard.conversationList.archive', 'Archive')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(e);
                  }} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t('dashboard.conversationList.delete', 'Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Row 2: Status, Priority, Channel badges */}
          <div className="flex items-center gap-1.5 text-xs">
            <Badge 
              className={cn("text-xs px-1 py-0 h-3.5 text-xs", statusColors[conversation.status])}
            >
              {t(`conversation.${conversation.status}`)}
            </Badge>
            
            <Badge 
              className={cn("text-xs px-1 py-0 h-3.5 text-xs", priorityColors[conversation.priority])}
            >
              {t(`conversation.${conversation.priority}`)}
            </Badge>
            
            <div className="flex items-center text-muted-foreground">
              <ChannelIcon className="h-3 w-3 mr-1" />
              <span className="text-xs capitalize">{conversation.channel}</span>
            </div>

            {isSnoozed && (
              <Badge variant="outline" className="text-xs px-1 py-0 h-3.5">
                <Clock className="w-2.5 h-2.5 mr-0.5" />
                {t('conversation.snoozed')}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div
        className={cn(
          "block md:hidden cursor-pointer border border-border/30 rounded-lg p-2 mb-1.5 bg-card hover:bg-accent/50 transition-colors",
          isSelected && "border-primary bg-accent",
          !conversation.is_read && "bg-accent/30"
        )}
        onClick={(e) => {
          console.log('Mobile click handler called:', conversation.id);
          onSelect(conversation);
        }}
      >
        <div className="flex items-start justify-between mb-1.5">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {conversation.customer?.full_name?.[0] || 'C'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">
                {conversation.customer?.full_name || 'Unknown'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {conversation.customer?.email}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {!conversation.is_read && (
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    console.log('Mobile dropdown trigger clicked');
                    e.stopPropagation();
                  }}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleArchive(e);
                }}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(e);
                }} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="text-sm font-medium truncate mb-1.5">{conversation.subject}</div>
        
        <div className="flex flex-wrap items-center gap-1 mb-1.5">
          <Badge className={cn("text-xs px-1 py-0 h-3.5", statusColors[conversation.status])}>
            {t(`conversation.${conversation.status}`)}
          </Badge>
          <Badge className={cn("text-xs px-1 py-0 h-3.5", priorityColors[conversation.priority])}>
            {t(`conversation.${conversation.priority}`)}
          </Badge>
          {isSnoozed && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-3.5">
              <Clock className="w-2.5 h-2.5 mr-0.5" />
              {t('conversation.snoozed')}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <ChannelIcon className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatConversationTime(conversation.updated_at)}
          </div>
        </div>
      </div>
    </>
  );
};