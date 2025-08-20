import React, { useState } from 'react';
import { Phone, PhoneOff, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Call } from '@/hooks/useCalls';

interface ManualEndCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  call: Call;
  onCallEnded?: () => void;
}

export const ManualEndCallDialog: React.FC<ManualEndCallDialogProps> = ({
  isOpen,
  onClose,
  call,
  onCallEnded
}) => {
  const { toast } = useToast();
  const [isEnding, setIsEnding] = useState(false);
  const [reason, setReason] = useState('');

  const handleEndCall = async () => {
    if (!call) return;

    setIsEnding(true);
    
    try {
      // Call the edge function to manually end the call
      const { data, error } = await supabase.functions.invoke('manual-end-call', {
        body: {
          callId: call.id,
          externalId: call.external_id,
          provider: call.provider,
          reason: reason || 'Manual termination by user'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Call Ended Successfully',
        description: 'The call has been manually marked as ended.',
      });

      onCallEnded?.();
      onClose();
      
    } catch (error) {
      console.error('Error ending call manually:', error);
      toast({
        title: 'Error Ending Call',
        description: 'Failed to end the call. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnding(false);
    }
  };

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneOff className="h-5 w-5 text-red-600" />
            Manual End Call
          </DialogTitle>
          <DialogDescription>
            You are about to manually end this ongoing call. This action is typically used when automatic call monitoring has failed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call Details */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Call Details</span>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer:</span>
                <span>{formatPhoneNumber(call.customer_phone)}</span>
              </div>
              {call.agent_phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agent:</span>
                  <span>{formatPhoneNumber(call.agent_phone)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="capitalize">{call.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">System ID:</span>
                <span className="font-mono text-xs">{call.id}</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Warning
              </p>
              <p className="text-yellow-700 dark:text-yellow-300">
                This will mark the call as ended in the system. Only use this if the automatic call monitoring has failed.
              </p>
            </div>
          </div>

          {/* Optional Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for manually ending this call..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This reason will be logged for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isEnding}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleEndCall}
            disabled={isEnding}
            className="gap-2"
          >
            {isEnding ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Ending Call...
              </>
            ) : (
              <>
                <PhoneOff className="h-4 w-4" />
                End Call
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};