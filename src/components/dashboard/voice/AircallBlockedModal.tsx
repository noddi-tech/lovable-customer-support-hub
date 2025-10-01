/**
 * Phase 6: Aircall Blocked Modal
 * 
 * Displays when browser extensions or settings are blocking Aircall
 * Provides clear instructions and troubleshooting steps
 */

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Shield, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AircallBlockedModalProps {
  isOpen: boolean;
  issues: string[];
  onRetry: () => void;
  onOpenIncognito: () => void;
}

const AircallBlockedModalComponent: React.FC<AircallBlockedModalProps> = ({
  isOpen,
  issues,
  onRetry,
  onOpenIncognito,
}) => {
  const hasNetworkBlock = issues.includes('network_blocked') || issues.includes('resources_blocked');

  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Connection Blocked</DialogTitle>
              <DialogDescription className="mt-1">
                Aircall is being blocked by your browser
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Issue Explanation */}
        <Alert className="border-destructive/50 bg-destructive/5">
          <Shield className="h-4 w-4 text-destructive" />
          <AlertDescription className="ml-2">
            {hasNetworkBlock ? (
              <>
                <strong>Ad blocker or privacy extension detected</strong>
                <br />
                Your browser is blocking connections to Aircall servers, which prevents the phone system from loading.
              </>
            ) : (
              <>
                <strong>Browser security settings</strong>
                <br />
                Your browser's security settings are preventing Aircall from initializing properly.
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Solution Steps */}
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">1</span>
              Try Incognito/Private Mode
            </h4>
            <p className="text-sm text-muted-foreground mb-3 ml-8">
              This temporarily disables most extensions and provides a clean environment
            </p>
            <Button
              onClick={onOpenIncognito}
              variant="outline"
              className="ml-8"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Incognito Mode
            </Button>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">2</span>
              Disable Ad Blockers for This Site
            </h4>
            <div className="text-sm text-muted-foreground space-y-1 ml-8">
              <p>Common extensions that may cause issues:</p>
              <ul className="list-disc list-inside pl-2">
                <li>uBlock Origin</li>
                <li>AdBlock Plus</li>
                <li>Privacy Badger</li>
                <li>Ghostery</li>
                <li>Any VPN or firewall extensions</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">3</span>
              After Fixing
            </h4>
            <p className="text-sm text-muted-foreground mb-3 ml-8">
              Once you've disabled blocking extensions, click the button below to retry
            </p>
            <Button
              onClick={onRetry}
              className="ml-8"
            >
              I've Fixed It - Retry Connection
            </Button>
          </div>
        </div>

        {/* Technical Details */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            Technical Details (for developers)
          </summary>
          <div className="mt-2 p-3 rounded-lg bg-muted text-xs font-mono">
            <div>Detected Issues: {issues.join(', ')}</div>
            <div className="mt-1">Required Domains: phone.aircall.io, api.aircall.io</div>
            <div className="mt-1">Required Permissions: microphone, camera (optional)</div>
          </div>
        </details>
      </DialogContent>
    </Dialog>
  );
};

export const AircallBlockedModal = AircallBlockedModalComponent;
