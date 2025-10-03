/**
 * Aircall Phone Bar
 * 
 * Fixed bottom bar that shows the embedded Aircall phone status and controls
 */

import React, { useEffect, useState } from 'react';
import { Phone, PhoneOff, PhoneMissed, Volume2, VolumeX, Users, Clock, ChevronDown, ChevronUp, Keyboard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAircallPhone } from '@/hooks/useAircallPhone';
import { useCallCustomerContext } from '@/hooks/useCallCustomerContext';
import { useCallKeyboardShortcuts } from '@/hooks/useCallKeyboardShortcuts';
import { useToast } from '@/hooks/use-toast';
import { ActiveCallContext } from './ActiveCallContext';
import { PostCallActions } from './PostCallActions';
import { CallControls } from './CallControls';
import { cn } from '@/lib/utils';

interface AircallPhoneBarProps {
  incomingCall?: any;
}

export const AircallPhoneBar = ({ incomingCall }: AircallPhoneBarProps = {}) => {
  const { toast } = useToast();
  const { 
    isInitialized, 
    isConnected, 
    currentCall, 
    answerCall, 
    rejectCall, 
    hangUp,
    showAircallWorkspace,
    hideAircallWorkspace,
    workspaceVisible,
    isWorkspaceReady
  } = useAircallPhone();
  
  // Unified call data helper - prefers SDK but falls back to database
  const getUnifiedCallData = () => {
    if (currentCall) {
      return {
        source: 'sdk',
        phone: currentCall.phone_number || currentCall.from || currentCall.to,
        customerName: currentCall.contact?.first_name 
          ? `${currentCall.contact.first_name} ${currentCall.contact.last_name}`
          : null,
        status: currentCall.status,
        direction: currentCall.direction,
        callId: currentCall.call_id?.toString(),
        startTime: currentCall.answered_at || currentCall.started_at,
        isRinging: currentCall.status === 'ringing',
        isOngoing: currentCall.status === 'ongoing' || currentCall.status === 'answered',
        isIncoming: currentCall.direction === 'inbound'
      };
    } else if (incomingCall) {
      return {
        source: 'database',
        phone: incomingCall.customer_phone,
        customerName: incomingCall.customers?.full_name,
        status: incomingCall.status,
        direction: incomingCall.direction,
        callId: incomingCall.id,
        startTime: incomingCall.started_at,
        isRinging: incomingCall.status === 'ringing',
        isOngoing: incomingCall.status === 'ongoing',
        isIncoming: incomingCall.direction === 'inbound'
      };
    }
    return null;
  };

  const unifiedCall = getUnifiedCallData();
  const hasActiveCall = !!unifiedCall;
  
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showPostCallActions, setShowPostCallActions] = useState(false);
  const [completedCall, setCompletedCall] = useState<any>(null);
  const { customer } = useCallCustomerContext();

  // Keyboard shortcuts
  const { showHelp } = useCallKeyboardShortcuts({
    onAnswer: answerCall,
    onHangUp: hangUp,
    onMute: () => setIsMuted(!isMuted),
    onHold: () => setIsOnHold(!isOnHold),
    onAddNote: () => setShowContext(true),
    isCallActive: !!currentCall && currentCall.status === 'ongoing',
  });

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

  // Detect call completion for post-call actions
  useEffect(() => {
    if (currentCall?.status === 'ongoing') {
      // Store the call for later when it completes
      setCompletedCall(currentCall);
    } else if (completedCall && !currentCall) {
      // Call just ended, show post-call actions
      setShowPostCallActions(true);
    }
  }, [currentCall, completedCall]);


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

  const handleTransfer = (agentId: string) => {
    console.log('Transfer call to agent:', agentId);
    // This would integrate with Aircall transfer API
  };

  const handlePostCallClose = () => {
    setShowPostCallActions(false);
    setCompletedCall(null);
  };

  // Enhanced debug logging with data sources
  useEffect(() => {
    console.log('[AircallPhoneBar] Data sources:', {
      hasSDKCall: !!currentCall,
      hasDatabaseCall: !!incomingCall,
      unifiedSource: unifiedCall?.source,
      unifiedCallData: unifiedCall,
      isWorkspaceReady
    });
  }, [currentCall, incomingCall, unifiedCall, isWorkspaceReady]);

  // Show connection status only if SDK not initialized
  if (!isInitialized) {
    console.log('[AircallPhoneBar] SDK not initialized - showing connection status');
    return (
      <div className="fixed bottom-4 left-4 bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-lg shadow-lg z-[100]">
        <div className="flex items-center gap-2 text-sm text-yellow-800">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Connecting to phone system...</span>
        </div>
      </div>
    );
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
      "fixed bottom-0 left-0 right-0 z-[100]",
      "border-t border-border bg-card shadow-lg backdrop-blur-sm",
      "transition-all duration-300",
      hasActiveCall ? "translate-y-0" : "translate-y-full"
    )}>
      {/* Expandable Customer Context Panel */}
      {showContext && currentCall && customer && (
        <div className="border-b border-border bg-muted/50 max-h-[400px] overflow-y-auto">
          <div className="container max-w-7xl mx-auto px-4 py-3">
            <ActiveCallContext 
              callId={currentCall.call_id?.toString() || ''} 
              customerPhone={currentCall.from || currentCall.to}
            />
          </div>
        </div>
      )}

      <div className="container max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Call Status */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Connection Indicator with Workspace Readiness */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              isWorkspaceReady
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : isConnected
                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                : "bg-muted text-muted-foreground"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isWorkspaceReady 
                  ? "bg-green-500 animate-pulse" 
                  : isConnected 
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-muted-foreground"
              )} />
              {isWorkspaceReady ? "Ready" : isConnected ? "Loading..." : "Disconnected"}
            </div>

            {/* Call Info - Shows data from SDK or database */}
            {unifiedCall && (
              <>
                <div className="h-6 w-px bg-border" />
                
                <div className="flex items-center gap-2">
                  {unifiedCall.isIncoming ? (
                    <Phone className="h-4 w-4 text-green-600 animate-pulse" />
                  ) : (
                    <Phone className="h-4 w-4 text-blue-600" />
                  )}
                  
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {unifiedCall.customerName || formatPhone(unifiedCall.phone)}
                    </p>
                    {unifiedCall.isOngoing && (
                      <p className="text-xs text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatDuration(callDuration)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Call Status Badge with Source Indicator */}
                <div className="flex items-center gap-2 ml-2">
                  <Badge variant={unifiedCall.isRinging ? "default" : "secondary"}>
                    {unifiedCall.isRinging ? "Ringing" : "Active"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {unifiedCall.source === 'sdk' ? 'SDK' : 'DB'}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {/* Center: Call Controls - SDK or database mode */}
          {unifiedCall && (
            <div className="flex items-center gap-2">
              {/* SDK Mode - Full controls when workspace is ready */}
              {unifiedCall.source === 'sdk' && (
                <>
                  {/* Answer (only for ringing incoming calls) */}
                  {unifiedCall.isRinging && unifiedCall.isIncoming && (
                    <Button
                      onClick={async () => {
                        if (!isWorkspaceReady) {
                          console.warn('[AircallPhoneBar] SDK not ready');
                          toast({
                            title: "Aircall Not Ready",
                            description: "Please wait for Aircall to finish loading",
                            variant: "destructive"
                          });
                          return;
                        }
                        await answerCall();
                      }}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled={!isWorkspaceReady}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Answer
                    </Button>
                  )}

                  {/* Call Controls (only for ongoing calls) */}
                  {unifiedCall.isOngoing && (
                    <CallControls
                      onMute={() => setIsMuted(!isMuted)}
                      onHold={() => setIsOnHold(!isOnHold)}
                      onTransfer={handleTransfer}
                      onHangUp={hangUp}
                      isMuted={isMuted}
                      isOnHold={isOnHold}
                      variant="compact"
                    />
                  )}

                  {/* Reject (only for ringing calls) */}
                  {unifiedCall.isRinging && (
                    <Button
                      onClick={rejectCall}
                      size="sm"
                      variant="destructive"
                    >
                      <PhoneOff className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  )}
                </>
              )}

              {/* Database Mode - Show "Answer in Browser" to open Aircall */}
              {unifiedCall.source === 'database' && unifiedCall.isRinging && (
                <Button
                  onClick={() => {
                    console.log('[AircallPhoneBar] Opening Aircall for database call');
                    showAircallWorkspace();
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Answer in Browser
                </Button>
              )}
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
            
            {/* Show Aircall button - Always available when connected */}
            {isConnected && (
              <Button
                onClick={() => showAircallWorkspace()}
                size="sm"
                variant="ghost"
                className="text-xs"
                title="Show Aircall phone interface"
              >
                <Phone className="h-3 w-3 mr-1" />
                Show Aircall
              </Button>
            )}

            {!currentCall && isConnected && (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Ready for calls
                </div>
                <Button
                  onClick={showHelp}
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                >
                  <Keyboard className="h-3 w-3 mr-1" />
                  Shortcuts
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Post-Call Actions Dialog */}
      <PostCallActions
        call={completedCall}
        isOpen={showPostCallActions}
        onClose={handlePostCallClose}
      />
    </div>
  );
};
