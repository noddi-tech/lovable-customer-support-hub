import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Clock,
  UserPlus,
  CheckCircle,
  XCircle,
  Move,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConversationView } from "@/contexts/ConversationViewContext";

export const ConversationHeader = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { conversation, dispatch, updateStatus, refreshConversation } = useConversationView();

  if (!conversation) return null;

  const handleArchive = async () => {
    await updateStatus({ status: 'closed', isArchived: true });
  };

  const handleUnarchive = async () => {
    await updateStatus({ isArchived: false });
  };

  const handleMarkResolved = async () => {
    await updateStatus({ status: 'resolved' });
  };

  const handleMarkOpen = async () => {
    await updateStatus({ status: 'open' });
  };

  const openAssignDialog = () => {
    dispatch({ type: 'SET_ASSIGN_DIALOG', payload: { open: true, userId: '', loading: false } });
  };

  const openMoveDialog = () => {
    dispatch({ type: 'SET_MOVE_DIALOG', payload: { open: true, inboxId: '', loading: false } });
  };

  const openSnoozeDialog = () => {
    dispatch({ type: 'SET_SNOOZE_DIALOG', payload: { open: true, date: new Date(), time: '09:00' } });
  };

  return (
    <div className="flex-shrink-0 p-3 md:p-4 border-b border-border bg-card/80 backdrop-blur-sm shadow-surface">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
          {/* Back to Inbox Button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/', { replace: true })}
            className="flex items-center gap-1 md:gap-2 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline text-sm">{t('conversation.backToInbox')}</span>
          </Button>
          
          <div className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
            <Avatar className="h-8 w-8 md:h-10 md:w-10 flex-shrink-0">
              <AvatarFallback>{conversation.customer?.full_name?.[0] || 'C'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm md:text-base line-clamp-1 mb-1">
                {conversation.subject}
              </h2>
              <div className="flex items-center space-x-2">
                <Badge variant={conversation.status === 'open' ? 'default' : 'secondary'} className="text-xs">
                  {conversation.status}
                </Badge>
                <Badge variant={conversation.priority === 'high' || conversation.priority === 'urgent' ? 'destructive' : 'outline'} className="text-xs">
                  {conversation.priority}
                </Badge>
                {conversation.is_archived && (
                  <Badge variant="outline" className="text-xs">Archived</Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshConversation}
            className="hidden md:flex"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('conversation.refresh')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={openAssignDialog}>
                <UserPlus className="w-4 h-4 mr-2" />
                {t('conversation.assign')}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={openMoveDialog}>
                <Move className="w-4 h-4 mr-2" />
                {t('conversation.move')}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={openSnoozeDialog}>
                <Clock className="w-4 h-4 mr-2" />
                {t('conversation.snooze')}
              </DropdownMenuItem>
              
              {conversation.status !== 'resolved' ? (
                <DropdownMenuItem onClick={handleMarkResolved}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('conversation.markResolved')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleMarkOpen}>
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('conversation.markOpen')}
                </DropdownMenuItem>
              )}
              
              {conversation.is_archived ? (
                <DropdownMenuItem onClick={handleUnarchive}>
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  {t('conversation.unarchive')}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="w-4 h-4 mr-2" />
                  {t('conversation.archive')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};