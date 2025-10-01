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
  onManualLoginConfirm?: () => void;
}

const AircallLoginModalComponent: React.FC<AircallLoginModalProps> = ({
  isOpen,
  isConnected,
  onManualLoginConfirm,
}) => {
  const [isChecking, setIsChecking] = React.useState(false);

  console.log('[AircallLoginModal] 🎯 Layer 4: Rendering modal', { isOpen, isConnected });
  
  const handleManualConfirm = async () => {
    if (!onManualLoginConfirm) return;
    
    setIsChecking(true);
    console.log('[AircallLoginModal] 🎯 Phase 4: User clicked manual confirm');
    
    try {
      await onManualLoginConfirm();
    } finally {
      // Reset after delay
      setTimeout(() => {
        setIsChecking(false);
      }, 3000);
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
                <p className="font-medium text-lg">Initializing Aircall Workspace</p>
                <p className="text-sm text-muted-foreground mt-2">
                  The Aircall login window will appear below
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
            
            {/* Phase 4: Enhanced Manual Login Button */}
            {onManualLoginConfirm && (
              <div className="p-5 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 shadow-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-base font-semibold text-foreground">Already completed the login?</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        If you've finished logging in but this window is still showing, click the button below to verify your connection.
                      </p>
                    </div>
                    <Button
                      onClick={handleManualConfirm}
                      size="lg"
                      disabled={isChecking}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      {isChecking ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Verifying Connection...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          I've Logged In - Verify Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const AircallLoginModal = AircallLoginModalComponent;
