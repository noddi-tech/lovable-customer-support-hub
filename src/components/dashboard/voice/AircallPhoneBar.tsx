/**
 * Aircall Phone Bar
 * 
 * Fixed bottom bar that shows the embedded Aircall phone status and controls
 */

import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, PhoneMissed, Volume2, VolumeX, Users, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAircallPhone } from '@/hooks/useAircallPhone';
import { useCallCustomerContext } from '@/hooks/useCallCustomerContext';
import { ActiveCallContext } from './ActiveCallContext';
import { cn } from '@/lib/utils';

export const AircallPhoneBar = () => {
  const { 
    isInitialized, 
    isConnected, 
    currentCall, 
    answerCall, 
    rejectCall, 
    hangUp 
  } = useAircallPhone();
  
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const { customer } = useCallCustomerContext();

  // Update call duration every second
  useEffect(() => {
    if (!currentCall || currentCall.status !== 'ongoing') {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      if (currentCall.answered_at) {
        const duration = Math.floor((Date.now() - currentCall.answered_at) / 1000);
        setCallDuration(duration);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentCall]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format phone number
  const formatPhone = (phone?: string) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, '$1 ($2) $3-$4');
  };

  // Don't show if SDK not initialized
  if (!isInitialized) {
    return null;
  }

  // Get call status details
  const getCallStatus = () => {
    if (!currentCall) return null;
    
    const isIncoming = currentCall.direction === 'inbound';
    const isRinging = currentCall.status === 'ringing';
    const isOngoing = currentCall.status === 'ongoing' || currentCall.status === 'answered';
    
    return { isIncoming, isRinging, isOngoing };
  };

  const callStatus = getCallStatus();

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50",
      "border-t border-border bg-card shadow-lg backdrop-blur-sm",
      "transition-all duration-300",
      currentCall ? "translate-y-0" : "translate-y-full"
    )}>
      {/* Expandable Customer Context Panel */}
      {showContext && currentCall && customer && (
        <div className="border-b border-border bg-muted/50 max-h-[400px] overflow-y-auto">
          <div className="container max-w-7xl mx-auto px-4 py-3">
            <ActiveCallContext 
              callId={currentCall.id?.toString() || ''} 
              customerPhone={currentCall.phone_number}
            />
          </div>
        </div>
      )}

      <div className="container max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Call Status */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Connection Indicator */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              isConnected 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : "bg-muted text-muted-foreground"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
              )} />
              {isConnected ? "Connected" : "Disconnected"}
            </div>

            {/* Call Info */}
            {currentCall && callStatus && (
              <>
                <div className="h-6 w-px bg-border" />
                
                <div className="flex items-center gap-2">
                  {callStatus.isIncoming ? (
                    <Phone className="h-4 w-4 text-green-600 animate-pulse" />
                  ) : (
                    <Phone className="h-4 w-4 text-blue-600" />
                  )}
                  
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {currentCall.contact?.first_name && currentCall.contact?.last_name
                        ? `${currentCall.contact.first_name} ${currentCall.contact.last_name}`
                        : formatPhone(currentCall.phone_number)
                      }
                    </p>
                    {callStatus.isOngoing && (
                      <p className="text-xs text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatDuration(callDuration)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Call Status Badge */}
                <Badge variant={callStatus.isRinging ? "default" : "secondary"} className="ml-2">
                  {callStatus.isRinging ? "Ringing" : "Active"}
                </Badge>
              </>
            )}
          </div>

          {/* Center: Call Controls */}
          {currentCall && callStatus && (
            <div className="flex items-center gap-2">
              {/* Answer (only for ringing incoming calls) */}
              {callStatus.isRinging && callStatus.isIncoming && (
                <Button
                  onClick={answerCall}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Answer
                </Button>
              )}

              {/* Mute/Unmute (only for ongoing calls) */}
              {callStatus.isOngoing && (
                <Button
                  onClick={() => setIsMuted(!isMuted)}
                  size="sm"
                  variant="outline"
                  className={isMuted ? "bg-red-500/10 border-red-500/20 text-red-600" : ""}
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Hang Up / Reject */}
              <Button
                onClick={callStatus.isRinging ? rejectCall : hangUp}
                size="sm"
                variant="destructive"
              >
                <PhoneOff className="h-4 w-4 mr-2" />
                {callStatus.isRinging ? "Reject" : "End Call"}
              </Button>
            </div>
          )}

          {/* Right: Context Toggle & Additional Info */}
          <div className="flex items-center gap-2">
            {currentCall && customer && (
              <Button
                onClick={() => setShowContext(!showContext)}
                size="sm"
                variant="ghost"
                className="text-xs"
              >
                {showContext ? (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Hide Context
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show Context
                  </>
                )}
              </Button>
            )}
            {!currentCall && isConnected && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Ready for calls
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
