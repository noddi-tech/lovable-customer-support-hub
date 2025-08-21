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
      {/* Desktop Layout - Ticket Format */}
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
        <div className="px-3 py-2.5 space-y-1">
          {/* Row 1: Customer + Status/Priority badges + Time + Menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">
                {conversation.customer?.full_name || 'Unknown'}
              </span>
              <Badge 
                className={cn("text-xs px-1.5 py-0.5 h-4", statusColors[conversation.status])}
              >
                {t(`conversation.${conversation.status}`, conversation.status)}
              </Badge>
              <Badge 
                className={cn("text-xs px-1.5 py-0.5 h-4", priorityColors[conversation.priority])}
              >
                {t(`conversation.${conversation.priority}`, conversation.priority)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatConversationTime(conversation.updated_at)}
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
          
          {/* Row 2: Subject */}
          <div className="font-semibold text-sm truncate">
            {conversation.subject || t('dashboard.conversation.noSubject', 'No Subject')}
          </div>
          
          {/* Row 3: Preview Text */}
          <div className="text-xs text-muted-foreground truncate">
            {conversation.preview_text || 'No preview available'}
          </div>
          
          {/* Row 4: Assignee + Channel + Tags */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {conversation.assigned_to ? (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarFallback className="text-xs text-muted-foreground">
                      {conversation.assigned_to.full_name?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {conversation.assigned_to.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <ChannelIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
              </div>
              
              {isSnoozed && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-3.5">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {t('conversation.snoozed', 'Snoozed')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout - Ticket Format */}
      <div
        className={cn(
          "block md:hidden cursor-pointer border border-border/30 rounded-lg p-3 mb-2 bg-card hover:bg-accent/50 transition-colors",
          isSelected && "border-primary bg-accent",
          !conversation.is_read && "bg-accent/30"
        )}
        onClick={(e) => {
          console.log('Mobile click handler called:', conversation.id);
          onSelect(conversation);
        }}
      >
        <div className="space-y-1.5">
          {/* Row 1: Customer + Badges + Time + Menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
                  {conversation.customer?.full_name?.[0] || 'C'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">
                {conversation.customer?.full_name || 'Unknown'}
              </span>
              <Badge className={cn("text-xs px-1 py-0 h-3.5", statusColors[conversation.status])}>
                {t(`conversation.${conversation.status}`, conversation.status)}
              </Badge>
              <Badge className={cn("text-xs px-1 py-0 h-3.5", priorityColors[conversation.priority])}>
                {t(`conversation.${conversation.priority}`, conversation.priority)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {formatConversationTime(conversation.updated_at)}
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
          
          {/* Row 2: Subject */}
          <div className="font-semibold text-sm truncate pl-7">
            {conversation.subject || t('dashboard.conversation.noSubject', 'No Subject')}
          </div>
          
          {/* Row 3: Preview Text */}
          <div className="text-xs text-muted-foreground truncate pl-7">
            {conversation.preview_text || 'No preview available'}
          </div>
          
          {/* Row 4: Assignee + Channel + Tags */}
          <div className="flex items-center justify-between pl-7">
            <div className="flex items-center gap-2">
              {conversation.assigned_to ? (
                <div className="flex items-center gap-1">
                  <Avatar className="h-3 w-3">
                    <AvatarFallback className="text-xs text-muted-foreground">
                      {conversation.assigned_to.full_name?.[0] || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">
                    {conversation.assigned_to.full_name}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <ChannelIcon className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground capitalize">{conversation.channel}</span>
              </div>
              
              {isSnoozed && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-3.5">
                  <Clock className="w-2.5 h-2.5 mr-0.5" />
                  {t('conversation.snoozed', 'Snoozed')}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};