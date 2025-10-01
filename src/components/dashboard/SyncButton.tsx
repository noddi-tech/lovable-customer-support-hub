import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

export const SyncButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-gmail-sync', {
        body: {}
      });

      if (error) {
        console.error('Sync error:', error);
        toast.error(t('dashboard.sync.error'));
      } else {
        console.log('Sync response:', data);
        toast.success(t('dashboard.sync.success'));
        
        // Refresh data without page reload
        await queryClient.invalidateQueries({ queryKey: ['conversations'] });
        await queryClient.invalidateQueries({ queryKey: ['inboxes'] });
        await queryClient.invalidateQueries({ queryKey: ['inboxCounts'] });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(t('dashboard.sync.error'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={isSyncing}
      variant="outline"
      size="sm"
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
      {isSyncing ? t('dashboard.header.syncing') : t('dashboard.header.sync')}
    </Button>
  );
};