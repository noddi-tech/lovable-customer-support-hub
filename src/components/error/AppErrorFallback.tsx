/**
 * Generic App Error Fallback Component
 * 
 * Shown when any component in the app crashes.
 * Provides a recovery UI with reload option.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const AppErrorFallback = () => {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md p-6 space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            An unexpected error occurred. Please try again.
          </AlertDescription>
        </Alert>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>This could be caused by:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>A temporary connection issue</li>
            <li>A browser extension conflict</li>
            <li>An outdated browser cache</li>
          </ul>
        </div>

        <Button onClick={handleReload} className="w-full">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reload Page
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          If this persists, try clearing your browser cache or contact support.
        </p>
      </Card>
    </div>
  );
};
