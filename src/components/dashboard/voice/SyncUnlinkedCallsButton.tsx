import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  details: Array<{
    callId: string;
    phone: string;
    status: 'synced' | 'failed' | 'skipped';
    reason?: string;
  }>;
}

export const SyncUnlinkedCallsButton = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const handleSync = async () => {
    if (!profile?.organization_id) {
      toast.error('No organization ID found');
      return;
    }

    setIsSyncing(true);
    setResult(null);

    try {
      console.log('[SyncUnlinkedCallsButton] 🚀 Starting background sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-unlinked-calls', {
        body: { organizationId: profile.organization_id },
      });

      if (error) {
        throw error;
      }

      const syncResult = data as SyncResult;
      setResult(syncResult);

      console.log('[SyncUnlinkedCallsButton] ✅ Sync complete:', syncResult);

      // Show toast notification
      if (syncResult.synced > 0) {
        toast.success(`Successfully synced ${syncResult.synced} call(s)`, {
          description: `Failed: ${syncResult.failed}, Skipped: ${syncResult.skipped}`,
        });
      } else if (syncResult.total === 0) {
        toast.info('No unlinked calls found');
      } else {
        toast.warning(`Sync completed with issues`, {
          description: `Total: ${syncResult.total}, Failed: ${syncResult.failed}, Skipped: ${syncResult.skipped}`,
        });
      }

      // Refresh calls and customers data
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['noddi-customer-lookup'] });
    } catch (error: any) {
      console.error('[SyncUnlinkedCallsButton] ❌ Sync error:', error);
      toast.error('Failed to sync calls', {
        description: error.message || 'Unknown error',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync Customers'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Sync Unlinked Calls</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will search for calls that don't have linked customer records and attempt to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Look up phone numbers in Noddi</li>
              <li>Create customer records in the database</li>
              <li>Link calls to customers</li>
            </ul>
            {result && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-semibold">Sync Results:</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <span>Total: {result.total}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Synced: {result.synced}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span>Failed: {result.failed}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span>Skipped: {result.skipped}</span>
                  </div>
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? 'Syncing...' : 'Start Sync'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
