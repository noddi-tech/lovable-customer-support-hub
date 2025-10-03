import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Phone, PhoneOff, PhoneCall, Calendar, AlertCircle, Package } from 'lucide-react';
import { VoiceCustomerSidebar } from './VoiceCustomerSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAircallPhone } from '@/hooks/useAircallPhone';
import { useCallCustomerContext } from '@/hooks/useCallCustomerContext';
import { useToast } from '@/hooks/use-toast';
import type { Call } from '@/hooks/useCalls';

interface IncomingCallModalProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
  onAnswerContext: (callId: string) => void;
}

export const IncomingCallModal = ({ call, isOpen, onClose, onAnswerContext }: IncomingCallModalProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { 
    answerCall, 
    isInitialized: isAircallReady, 
    showAircallWorkspace,
    isWorkspaceReady 
  } = useAircallPhone();
  const { noddiData } = useCallCustomerContext();
  const [currentCall, setCurrentCall] = useState<Call | null>(call);

  // Update current call when prop changes
  useEffect(() => {
    setCurrentCall(call);
  }, [call]);

  // Subscribe to real-time updates for this call
  useEffect(() => {
    if (!currentCall?.id) return;

    console.log('[IncomingCallModal] 📡 Subscribing to real-time updates for call:', currentCall.id);

    const channel = supabase
      .channel(`incoming-call-${currentCall.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'calls',
          filter: `id=eq.${currentCall.id}`
        },
        (payload) => {
          const updatedCall = payload.new as Call;
          console.log('[IncomingCallModal] 🔄 Call updated:', {
            old_status: currentCall.status,
            new_status: updatedCall.status
          });
          
          setCurrentCall(updatedCall);

          // Auto-close if call has ended (completed or failed) - give user time to see who called
          if (updatedCall.status === 'completed' || updatedCall.status === 'failed') {
            console.log('[IncomingCallModal] 🚪 Auto-closing modal in 10s - call ended');
            setTimeout(() => {
              onClose();
            }, 10000); // 10 seconds to see who called
          }

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['calls'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCall?.id, onClose, queryClient]);

  // Auto-close after 60 seconds if still open (safety timeout)
  useEffect(() => {
    if (!isOpen) return;

    console.log('[IncomingCallModal] ⏱️ Setting safety timeout (60s)');
    const timer = setTimeout(() => {
      console.log('[IncomingCallModal] ⏰ Safety timeout reached - closing modal');
      onClose();
    }, 60000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!currentCall) return null;

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  const uiMeta = noddiData?.data?.ui_meta;
  const priorityBooking = noddiData?.data?.priority_booking;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[200]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600 animate-pulse" />
            Incoming Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call Header */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Caller</p>
              <p className="text-xl font-semibold">
                {uiMeta?.display_name || formatPhoneNumber(currentCall.customer_phone)}
              </p>
              {uiMeta?.display_name && (
                <p className="text-sm text-muted-foreground font-mono">
                  {formatPhoneNumber(currentCall.customer_phone)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {currentCall.status === 'completed' || currentCall.status === 'failed' ? (
                <>
                  <div className="h-3 w-3 bg-gray-400 rounded-full" />
                  <span className="text-sm font-medium text-muted-foreground">Call Ended</span>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">Ringing</span>
                </>
              )}
            </div>
          </div>

          {/* Priority Booking Alert - PROMINENT */}
          {priorityBooking && uiMeta?.status_label && (
            <Alert className="border-primary bg-primary/5">
              <AlertCircle className="h-5 w-5 text-primary" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-base">{uiMeta.status_label}</span>
                    {uiMeta.booking_date_iso && (
                      <Badge className="ml-2">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(uiMeta.booking_date_iso).toLocaleDateString()}
                      </Badge>
                    )}
                  </div>
                  {uiMeta.vehicle_label && (
                    <div className="text-sm text-muted-foreground">
                      Vehicle: {uiMeta.vehicle_label}
                    </div>
                  )}
                  {uiMeta.service_title && (
                    <div className="text-sm text-muted-foreground">
                      Service: {uiMeta.service_title}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Unpaid Bookings Warning */}
          {uiMeta?.unpaid_count > 0 && (
            <Alert variant="destructive">
              <Package className="h-4 w-4" />
              <AlertDescription className="font-medium">
                ⚠️ {uiMeta.unpaid_count} unpaid booking{uiMeta.unpaid_count > 1 ? 's' : ''} - 
                Total outstanding: {uiMeta.money?.currency} {uiMeta.money?.outstanding}
              </AlertDescription>
            </Alert>
          )}

          {/* Customer Sidebar Embedded */}
          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
            <VoiceCustomerSidebar call={currentCall} />
          </div>

          {/* Action Buttons */}
          {currentCall.status !== 'completed' && currentCall.status !== 'failed' ? (
            <div className="flex gap-2">
              {/* Show Aircall Button - Always available */}
              <Button
                onClick={() => {
                  showAircallWorkspace();
                  console.log('[IncomingCallModal] 📱 Opening Aircall workspace');
                }}
                variant="outline"
                size="lg"
                title="Open Aircall phone interface"
              >
                <Phone className="h-4 w-4 mr-2" />
                Show Aircall
              </Button>
              
              {/* Answer via Aircall Everywhere (if enabled) */}
              {isAircallReady && (
                <Button
                  onClick={async () => {
                    // SDK Readiness Guard
                    if (!isWorkspaceReady) {
                      console.warn('[IncomingCallModal] SDK not ready:', { 
                        isAircallReady, 
                        isWorkspaceReady
                      });
                      toast({
                        title: "Aircall Not Ready",
                        description: "Please wait for Aircall to finish loading",
                        variant: "destructive"
                      });
                      return;
                    }
                    console.log('[IncomingCallModal] Answering call via SDK');
                    await answerCall();
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  disabled={!isWorkspaceReady}
                >
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Answer in Browser
                </Button>
              )}
              
              {/* View Full Context */}
              <Button
                onClick={() => onAnswerContext(currentCall.id)}
                variant="outline"
                size="lg"
              >
                <Phone className="h-4 w-4 mr-2" />
                View Details
              </Button>
              
              {/* Dismiss */}
              <Button
                onClick={onClose}
                variant="outline"
                size="lg"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                Dismiss
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground text-center py-2">
                This call has ended. Modal will close in a few seconds...
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onAnswerContext(currentCall.id)}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  View Call Details
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="lg"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
