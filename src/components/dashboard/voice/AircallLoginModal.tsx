/**
 * Aircall Login Modal
 * 
 * Non-dismissible modal that forces users to log in to Aircall
 * Automatically hides after successful login
 */

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Phone, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AircallLoginModalProps {
  isOpen: boolean;
  isConnected: boolean;
}

export const AircallLoginModal: React.FC<AircallLoginModalProps> = ({
  isOpen,
  isConnected,
}) => {
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

        {/* Aircall Workspace Container */}
        <div className="mt-4 relative">
          {!isConnected && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 rounded-lg">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">
                  Waiting for login...
                </p>
              </div>
            </div>
          )}
          
          <div 
            id="aircall-workspace-container"
            className="min-h-[500px] max-h-[60vh] overflow-auto rounded-lg border border-border bg-muted/30"
          />
        </div>

        {!isConnected && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> This window will automatically close once you've successfully logged in.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
