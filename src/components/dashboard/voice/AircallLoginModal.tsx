/**
 * Aircall Login Modal
 * 
 * Non-dismissible modal that forces users to log in to Aircall
 * Automatically hides after successful login
 */

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AircallLoginModalProps {
  isOpen: boolean;
  isConnected: boolean;
  isWaitingForWorkspace?: boolean;
  onManualLoginConfirm?: () => void;
  onSkip?: () => void;
}

const AircallLoginModalComponent: React.FC<AircallLoginModalProps> = ({
  isOpen,
  isConnected,
  isWaitingForWorkspace = false,
  onManualLoginConfirm,
  onSkip,
}) => {
  const [isChecking, setIsChecking] = React.useState(false);
  const [verificationStatus, setVerificationStatus] = React.useState<'idle' | 'checking' | 'success' | 'failed'>('idle');

  console.log('[AircallLoginModal] 🎯 Layer 4: Rendering modal', { isOpen, isConnected });
  
  // Phase 5: SIMPLIFIED manual verification - single attempt
  const handleManualConfirm = async () => {
    if (!onManualLoginConfirm) return;
    
    setIsChecking(true);
    setVerificationStatus('checking');
    console.log('[AircallLoginModal] 🎯 Phase 5: User clicked manual verification');
    
    try {
      await onManualLoginConfirm();
      setVerificationStatus('success');
    } catch (error) {
      console.warn('[AircallLoginModal] Verification failed:', error);
      setVerificationStatus('failed');
      setTimeout(() => {
        setIsChecking(false);
        setVerificationStatus('idle');
      }, 5000);
    }
  };
  
  return (
    <Dialog open={isOpen}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Aircall Login Required</DialogTitle>
              <DialogDescription className="mt-1">
                Please log in to your Aircall account to access the phone system
              </DialogDescription>
            </div>
            {isConnected && (
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
                Connected
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Instructions */}
        <div className="mt-4 relative">
          <div className="min-h-[500px] max-h-[60vh] flex items-center justify-center rounded-lg border border-border bg-muted/30">
            <div className="text-center space-y-4 p-8">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <p className="font-medium text-lg">
                  {isWaitingForWorkspace ? 'Waiting for Aircall Workspace...' : 'Initializing Aircall Workspace'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {isWaitingForWorkspace 
                    ? 'Please wait while we prepare the login window'
                    : 'The Aircall login window will appear below'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {!isConnected && (
          <div className="mt-4 space-y-3">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> This window will automatically close once you've successfully logged in.
              </p>
            </div>
            
            {/* Phase 5: Manual Login Button - SHOWN IMMEDIATELY */}
            {onManualLoginConfirm && !isWaitingForWorkspace && (
              <div className="p-5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-xl font-bold text-foreground">1. Log in above</p>
                      <p className="text-xl font-bold text-foreground mt-1">2. Click this button</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Complete your login in the Aircall window, then click below to verify your connection.
                      </p>
                    </div>
                    
                    {/* Status feedback */}
                    {verificationStatus === 'checking' && (
                      <div className="p-3 rounded-lg bg-primary/10 text-sm">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="font-medium">Verifying your login...</span>
                        </div>
                      </div>
                    )}
                    
                    {verificationStatus === 'failed' && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
                        <p className="font-medium">Login not detected</p>
                        <p className="text-xs mt-1">
                          Wait 10 seconds after logging in, then try again
                        </p>
                      </div>
                    )}
                    
                    <Button
                      onClick={handleManualConfirm}
                      size="lg"
                      disabled={isChecking}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base py-6"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Verifying Connection...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          ✓ I've Logged In - Click to Verify
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Phase 6: Emergency Escape Hatch */}
            {onSkip && !isWaitingForWorkspace && (
              <div className="pt-3 border-t border-border">
                <Button
                  onClick={onSkip}
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Skip Phone Integration for This Session
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  You can enable it later by refreshing the page
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const AircallLoginModal = AircallLoginModalComponent;
