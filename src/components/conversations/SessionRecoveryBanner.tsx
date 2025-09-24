import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useSessionRecovery } from '@/hooks/useSessionRecovery';

interface SessionRecoveryBannerProps {
  show: boolean;
  onHide?: () => void;
}

export function SessionRecoveryBanner({ show, onHide }: SessionRecoveryBannerProps) {
  const { isRecovering, recoverSession, canRetry, retryCount } = useSessionRecovery();

  const handleRecoverSession = async () => {
    const success = await recoverSession();
    if (success && onHide) {
      onHide();
    }
  };

  if (!show) return null;

  return (
    <div className="sticky top-0 z-50 border-b bg-warning/10 border-warning/20">
      <Alert className="border-0 bg-transparent">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="flex items-center justify-between w-full">
          <span className="text-sm">
            {retryCount === 0 
              ? "Session expired. Some data may not load correctly." 
              : `Session recovery failed (${retryCount} attempts). Try refreshing your session.`
            }
          </span>
          <div className="flex items-center gap-2">
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecoverSession}
                disabled={isRecovering}
                className="h-7 text-xs"
              >
                {isRecovering ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    Recovering...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh Session
                  </>
                )}
              </Button>
            )}
            {retryCount >= 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/auth'}
                className="h-7 text-xs"
              >
                Log In Again
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}