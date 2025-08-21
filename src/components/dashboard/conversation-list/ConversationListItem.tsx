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
          "hidden md:block cursor-pointer hover:bg-accent/50 transition-colors border-b border-border/50",
          isSelected && "bg-accent border-primary/20",
          !conversation.is_read && "bg-accent/30"
        )}
        onClick={() => onSelect(conversation)}
      >
        <div className="row px-4 py-3">
          <div className="col--status flex items-center space-x-2">
            <Badge className={cn("text-xs", statusColors[conversation.status])}>
              {conversation.status}
            </Badge>
            <Badge className={cn("text-xs", priorityColors[conversation.priority])}>
              {conversation.priority}
            </Badge>
            {isSnoozed && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Snoozed
              </Badge>
            )}
          </div>
          <div className="col--from flex items-center space-x-2 min-w-0">
            <Avatar className="h-8 w-8 flex-shrink-0">
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
          <div className="col--subject min-w-0">
            <div className="font-medium text-sm truncate mb-1">{conversation.subject}</div>
            <div className="flex items-center space-x-1">
              <ChannelIcon className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
            </div>
          </div>
          <div className="col--date text-right">
            <div className="text-xs text-muted-foreground">
              {formatConversationTime(conversation.updated_at)}
            </div>
            {!conversation.is_read && (
              <div className="w-2 h-2 bg-primary rounded-full mt-1 ml-auto"></div>
            )}
          </div>
          <div className="flex-shrink-0 w-10 flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
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
      </div>

      {/* Mobile Layout */}
      <div
        className={cn(
          "block md:hidden cursor-pointer border border-border rounded-lg p-3 mb-2 bg-card hover:bg-accent/50 transition-colors",
          isSelected && "border-primary bg-accent",
          !conversation.is_read && "bg-accent/30"
        )}
        onClick={() => onSelect(conversation)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <Avatar className="h-8 w-8 flex-shrink-0">
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
              <div className="w-2 h-2 bg-primary rounded-full"></div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
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
          </div>
        </div>
        
        <div className="text-sm font-medium truncate mb-2">{conversation.subject}</div>
        
        <div className="flex flex-wrap items-center gap-1 mb-2">
          <Badge className={cn("text-xs", statusColors[conversation.status])}>
            {conversation.status}
          </Badge>
          <Badge className={cn("text-xs", priorityColors[conversation.priority])}>
            {conversation.priority}
          </Badge>
          {isSnoozed && (
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Snoozed
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