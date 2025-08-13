import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const SyncButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { t } = useTranslation();

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
        
        // Refresh the page after a short delay to see new messages
        setTimeout(() => {
          window.location.reload();
        }, 3000);
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