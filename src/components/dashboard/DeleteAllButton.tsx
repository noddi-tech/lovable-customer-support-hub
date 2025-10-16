import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

export const DeleteAllButton = () => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Delete all conversations (which will cascade to delete all messages)
      const { error } = await supabase
        .from('conversations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        console.error('Delete error:', error);
        toast.error(t('dashboard.deleteAll.error'));
      } else {
        toast.success(t('dashboard.deleteAll.success'));
        
        // Only invalidate conversation-related queries
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          queryClient.invalidateQueries({ queryKey: ['conversation-messages'] });
          queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
          queryClient.invalidateQueries({ queryKey: ['all-counts'] });
        }, 1000);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(t('dashboard.deleteAll.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button 
          variant="destructive"
          size="sm"
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          {t('dashboard.header.deleteAll')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dashboard.deleteAll.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dashboard.deleteAll.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('dashboard.deleteAll.cancel')}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDeleteAll}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t('dashboard.deleteAll.deleting') : t('dashboard.deleteAll.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};