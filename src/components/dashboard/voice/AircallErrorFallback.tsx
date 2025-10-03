/**
 * Aircall Error Fallback Component
 * 
 * Shown when the Aircall integration crashes.
 * Provides a recovery UI instead of a blank screen.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Phone } from 'lucide-react';

export const AircallErrorFallback = () => {
  const handleReload = () => {
    // Trigger voice system reset
    window.dispatchEvent(new CustomEvent('voice-system-reset'));
    window.location.reload();
  };

  const handleSkip = () => {
    sessionStorage.setItem('aircall_opted_out', 'true');
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Phone System Error</AlertTitle>
          <AlertDescription>
            The phone integration encountered an error and needs to be restarted.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>This could be caused by:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Browser extension conflicts</li>
            <li>Third-party cookie restrictions</li>
            <li>Network connectivity issues</li>
            <li>Temporary service disruption</li>
          </ul>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleReload} className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload Phone System
          </Button>
          <Button onClick={handleSkip} variant="outline">
            <Phone className="h-4 w-4 mr-2" />
            Continue Without Phone
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          If this persists, contact support or check your browser settings.
        </p>
      </Card>
    </div>
  );
};
