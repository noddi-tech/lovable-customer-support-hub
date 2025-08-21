import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useConversationList } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";

export const ConversationListDeleteDialog = () => {
  const { state, dispatch, deleteConversation } = useConversationList();
  const { t } = useTranslation();

  const handleConfirm = () => {
    deleteConversation(state.conversationToDelete!);
  };

  const handleCancel = () => {
    dispatch({ type: 'CLOSE_DELETE_DIALOG' });
  };

  return (
    <AlertDialog open={state.deleteDialogOpen} onOpenChange={handleCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('dashboard.conversationList.deleteTitle', 'Delete Conversation')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('dashboard.conversationList.deleteDescription', 
              'Are you sure you want to delete this conversation? This action cannot be undone and will permanently remove all messages in this conversation.'
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {t('dashboard.conversationList.cancel', 'Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive hover:bg-destructive/90">
            {t('dashboard.conversationList.delete', 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};