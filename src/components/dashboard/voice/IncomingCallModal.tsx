import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { VoiceCustomerSidebar } from './VoiceCustomerSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import type { Call } from '@/hooks/useCalls';

interface IncomingCallModalProps {
  call: Call | null;
  isOpen: boolean;
  onClose: () => void;
  onAnswerContext: (callId: string) => void;
}

export const IncomingCallModal = ({ call, isOpen, onClose, onAnswerContext }: IncomingCallModalProps) => {
  const queryClient = useQueryClient();
  const [currentCall, setCurrentCall] = useState<Call | null>(call);

  // Update current call when prop changes
  useEffect(() => {
    setCurrentCall(call);
  }, [call]);

  // Subscribe to real-time updates for this call
  useEffect(() => {
    if (!currentCall?.id) return;

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
          setCurrentCall(updatedCall);

          // Auto-close if call status changes from ringing
          if (updatedCall.status !== 'ringing') {
            setTimeout(() => {
              onClose();
            }, 2000);
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

  // Auto-close after 30 seconds
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, 30000);

    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!currentCall) return null;

  const formatPhoneNumber = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-green-600 animate-pulse" />
            Incoming Call
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Call Header */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Caller</p>
              <p className="text-xl font-semibold">{formatPhoneNumber(currentCall.customer_phone)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground">Ringing</span>
            </div>
          </div>

          {/* Customer Sidebar Embedded */}
          <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
            <VoiceCustomerSidebar call={currentCall} />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => onAnswerContext(currentCall.id)}
              className="flex-1"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              View Full Context
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="lg"
            >
              <PhoneOff className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
