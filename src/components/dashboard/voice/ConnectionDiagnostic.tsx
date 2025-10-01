import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionDiagnosticProps {
  isWebSocketBlocked?: boolean;
  isSDKFailed?: boolean;
  onRetry?: () => void;
}

/**
 * ConnectionDiagnostic Component
 * 
 * Displays user-friendly messages when WebSocket connections are blocked
 * or when the Aircall SDK fails to initialize properly.
 */
export const ConnectionDiagnostic = ({ 
  isWebSocketBlocked, 
  isSDKFailed,
  onRetry 
}: ConnectionDiagnosticProps) => {
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    // Show diagnostic if either WebSocket is blocked OR SDK failed
    if (isWebSocketBlocked || isSDKFailed) {
      setShowDiagnostic(true);
    } else {
      setShowDiagnostic(false);
    }
  }, [isWebSocketBlocked, isSDKFailed]);

  if (!showDiagnostic) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <div className="flex items-start gap-3">
        {isWebSocketBlocked ? (
          <WifiOff className="h-5 w-5 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 mt-0.5" />
        )}
        <div className="flex-1 space-y-2">
          <AlertTitle>
            {isWebSocketBlocked 
              ? 'Connection Blocked' 
              : 'Phone System Connection Failed'}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            {isWebSocketBlocked && (
              <>
                <p className="text-sm">
                  Real-time updates are being blocked by your browser or network settings.
                </p>
                <div className="text-sm space-y-1">
                  <p className="font-medium">Possible causes:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Browser extensions (ad blockers, privacy tools)</li>
                    <li>Corporate firewall or network restrictions</li>
                    <li>VPN or proxy settings</li>
                  </ul>
                </div>
                <p className="text-sm font-medium">
                  Using polling mode - some features may be delayed
                </p>
              </>
            )}
            
            {isSDKFailed && (
              <>
                <p className="text-sm">
                  Unable to connect to the phone system. This may be due to:
                </p>
                <div className="text-sm space-y-1">
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Invalid API credentials</li>
                    <li>Network connectivity issues</li>
                    <li>Aircall service unavailable</li>
                  </ul>
                </div>
              </>
            )}
            
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
};