import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useSessionSync } from '@/hooks/useSessionSync';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SessionSyncButtonProps {
  onSyncSuccess?: () => void;
  showAlert?: boolean;
}

export function SessionSyncButton({ onSyncSuccess, showAlert = true }: SessionSyncButtonProps) {
  const { isSyncing, forceSessionSync, hasSession, canSync, syncAttempts } = useSessionSync();

  const handleSync = async () => {
    const success = await forceSessionSync();
    if (success && onSyncSuccess) {
      onSyncSuccess();
    }
  };

  if (!showAlert && hasSession) {
    return null;
  }

  return (
    <div className="space-y-2">
      {showAlert && !hasSession && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Session sync issue detected. Some conversations may not load properly.
          </AlertDescription>
        </Alert>
      )}
      
      {canSync && (
        <Button 
          onClick={handleSync}
          disabled={isSyncing}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing Session...' : `Sync Session${syncAttempts > 0 ? ` (${syncAttempts})` : ''}`}
        </Button>
      )}
      
      {!canSync && syncAttempts >= 3 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Multiple sync attempts failed. Please refresh the page or log in again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}