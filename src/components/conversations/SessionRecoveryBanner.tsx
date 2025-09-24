import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, LogOut, X } from 'lucide-react';
import { useAggressiveSessionRecovery } from '@/hooks/useAggressiveSessionRecovery';
import { toast } from 'sonner';

interface SessionRecoveryBannerProps {
  show?: boolean;
  onHide?: () => void;
  onRecoverySuccess?: () => void;
  showAlways?: boolean;
}

export function SessionRecoveryBanner({ show = true, onHide, onRecoverySuccess, showAlways = false }: SessionRecoveryBannerProps) {
  const { healthState, isRecovering, aggressiveRecovery, nuclearSessionReset } = useAggressiveSessionRecovery();
  const [isDismissed, setIsDismissed] = useState(false);

  const handleAggressiveRecovery = async () => {
    const success = await aggressiveRecovery();
    if (success && onRecoverySuccess) {
      onRecoverySuccess();
      handleDismiss();
    }
  };

  const handleNuclearReset = async () => {
    const confirmed = window.confirm('This will log you out and redirect to the login page. Continue?');
    if (confirmed) {
      await nuclearSessionReset();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onHide) {
      onHide();
    }
  };

  const shouldShow = show && !isDismissed && (showAlways || (!healthState.isHealthy && healthState.consecutiveFailures >= 2));

  if (!shouldShow) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 mx-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <strong>Session Issue Detected</strong>
          <br />
          <span className="text-sm">
            Conversations may not load properly. {healthState.consecutiveFailures} consecutive failures.
          </span>
        </div>
        <div className="flex gap-2 ml-4">
          <Button
            onClick={handleAggressiveRecovery}
            disabled={isRecovering}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRecovering ? 'animate-spin' : ''}`} />
            {isRecovering ? 'Recovering...' : 'Fix Session'}
          </Button>
          <Button
            onClick={handleNuclearReset}
            disabled={isRecovering}
            variant="destructive"
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Force Re-login
          </Button>
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}