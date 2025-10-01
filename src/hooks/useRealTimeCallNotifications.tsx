import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useVoiceIntegrations } from './useVoiceIntegrations';
import { useRealtimeConnectionManager } from './useRealtimeConnectionManager';
import { getMonitoredPhoneForCall } from '@/utils/phoneNumberUtils';
import { Phone, PhoneCall, PhoneOff, Voicemail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Call } from './useCalls';

interface CallEvent {
  id: string;
  call_id: string;
  event_type: string;
  event_data: any;
  timestamp: string;
  created_at: string;
}

export const useRealTimeCallNotifications = () => {
  const { toast } = useToast();
  const { getIntegrationByProvider } = useVoiceIntegrations();
  const queryClient = useQueryClient();
  const { createManagedSubscription } = useRealtimeConnectionManager();
  const navigate = useNavigate();
  const aircallIntegration = getIntegrationByProvider('aircall');
  const processedEventsRef = useRef(new Set<string>());
  
  // Modal state for incoming calls
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isIncomingCallModalOpen, setIsIncomingCallModalOpen] = useState(false);

  console.log('🔍 useRealTimeCallNotifications hook initialized - CONSOLIDATING SUBSCRIPTIONS');

  useEffect(() => {
    console.log('📡 useRealTimeCallNotifications: Setting up subscriptions...');
    
    // Create managed subscription for call events
    const unsubscribeCallEvents = createManagedSubscription(
      'call-events-notifications',
      (channel) => channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_events'
        },
        async (payload) => {
          console.log('New call event received:', payload);
          const callEvent = payload.new as CallEvent;
          
          // Prevent duplicate processing
          if (processedEventsRef.current.has(callEvent.id)) {
            return;
          }
          processedEventsRef.current.add(callEvent.id);

          // Get the associated call data
          try {
            const { data: call, error } = await supabase
              .from('calls')
              .select('*')
              .eq('id', callEvent.call_id)
              .single();

            if (error) {
              console.error('Error fetching call data:', error);
              return;
            }

            await handleCallEventNotification(callEvent, call);
          } catch (error) {
            console.error('Error processing call event:', error);
          }
        }
      ),
      [createManagedSubscription, queryClient]
    );

    // Create managed subscription for call status changes
    const unsubscribeCallStatus = createManagedSubscription(
      'calls-notifications',
      (channel) => channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calls'
        },
        async (payload) => {
          console.log('Call status change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const call = payload.new as Call;
            await handleNewCallNotification(call);
          } else if (payload.eventType === 'UPDATE') {
            const oldCall = payload.old as Call;
            const newCall = payload.new as Call;
            
            if (oldCall.status !== newCall.status) {
              await handleCallStatusChangeNotification(oldCall, newCall);
            }
          }

          // Refresh call data
          queryClient.invalidateQueries({ queryKey: ['calls'] });
          queryClient.invalidateQueries({ queryKey: ['call-events'] });
        }
      ),
      [aircallIntegration, createManagedSubscription, queryClient]
    );

    return () => {
      unsubscribeCallEvents();
      unsubscribeCallStatus();
    };
  }, [aircallIntegration, createManagedSubscription, queryClient]);

  const handleCallEventNotification = async (callEvent: CallEvent, call: Call) => {
    const monitoredPhone = getMonitoredPhoneForCall(call, aircallIntegration);
    
    let title = '';
    let description = '';
    let icon = <Phone className="h-4 w-4" />;
    let shouldNotify = false;

    switch (callEvent.event_type) {
      case 'call_started':
        if (call.direction === 'inbound') {
          console.log('[CallNotifications] 🎬 call_started event - triggering modal!', {
            call_id: call.id,
            status: call.status,
            customer_phone: call.customer_phone
          });
          
          // Trigger modal immediately on call_started event
          setIncomingCall(call);
          setIsIncomingCallModalOpen(true);
          
          title = '📞 Incoming Call';
          description = `Call from ${call.customer_phone}`;
          icon = <PhoneCall className="h-4 w-4 text-green-600" />;
          shouldNotify = true;
        }
        break;
        
      case 'call_missed':
        title = '❌ Missed Call';
        description = `Missed call from ${call.customer_phone}`;
        icon = <PhoneOff className="h-4 w-4 text-red-600" />;
        shouldNotify = true;
        break;
        
      case 'voicemail_left':
        title = '🎙️ New Voicemail';
        description = `Voicemail from ${call.customer_phone}`;
        icon = <Voicemail className="h-4 w-4 text-blue-600" />;
        shouldNotify = true;
        break;
        
      case 'callback_requested':
        title = '📞 Callback Requested';
        description = `${call.customer_phone} requested a callback`;
        icon = <Phone className="h-4 w-4 text-orange-600" />;
        shouldNotify = true;
        break;
    }

    if (shouldNotify) {
      const fullDescription = `${description}${monitoredPhone ? ` on ${monitoredPhone.phoneNumber.label}` : ''}`;
      
      toast({
        title,
        description: (
          <div className="space-y-3">
            <p>{fullDescription}</p>
            <div className="text-sm text-muted-foreground">
              Customer: {call.customer_phone}
            </div>
            {monitoredPhone && (
              <div className="text-sm text-muted-foreground">
                Line: {monitoredPhone.phoneNumber.label} ({monitoredPhone.type})
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => navigateToCall(call.id)}
                className="h-8"
              >
                View Call
              </Button>
              {callEvent.event_type === 'callback_requested' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCallbackAction(call.id)}
                  className="h-8"
                >
                  Schedule Callback
                </Button>
              )}
              {callEvent.event_type === 'voicemail_left' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVoicemailAction(call.id)}
                  className="h-8"
                >
                  Listen
                </Button>
              )}
            </div>
          </div>
        ),
        duration: 10000, // Show for 10 seconds
      });

      // Create a persistent notification in the database
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user.user) {
          await supabase
            .from('notifications')
            .insert({
              user_id: user.user.id,
              title,
              message: fullDescription,
              type: 'info',
              data: {
                call_id: call.id,
                event_type: callEvent.event_type,
                customer_phone: call.customer_phone,
                monitored_line: monitoredPhone?.phoneNumber.label,
                line_type: monitoredPhone?.type
              }
            });
        }
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    }
  };

  const handleNewCallNotification = async (call: Call) => {
    console.log('[CallNotifications] 📞 New call detected:', {
      id: call.id,
      direction: call.direction,
      status: call.status,
      customer_phone: call.customer_phone,
      created_at: call.created_at
    });

    const monitoredPhone = getMonitoredPhoneForCall(call, aircallIntegration);
    
    // Trigger modal for ANY new inbound call that hasn't explicitly ended
    // This catches calls even if they transition quickly from ringing -> completed
    const shouldShowModal = 
      call.direction === 'inbound' && 
      call.status !== 'completed' && 
      call.status !== 'failed';
    
    console.log('[CallNotifications] 🎯 Should show modal?', shouldShowModal);
    
    if (shouldShowModal) {
      console.log('[CallNotifications] 🚀 Opening incoming call modal with customer data fetch...');
      
      // Show modal for incoming calls - VoiceCustomerSidebar will auto-fetch Noddi data
      setIncomingCall(call);
      setIsIncomingCallModalOpen(true);
      
      // Also show a toast for quick notification
      const title = '📞 New Incoming Call';
      const description = `Call from ${call.customer_phone}${monitoredPhone ? ` on ${monitoredPhone.phoneNumber.label}` : ''}`;
      
      toast({
        title,
        description,
        duration: 5000,
      });
    } else if (call.direction === 'inbound') {
      console.log('[CallNotifications] ⏭️ Skipping modal (call already ended):', call.status);
    }
  };

  const handleCallStatusChangeNotification = async (oldCall: Call, newCall: Call) => {
    let title = '';
    let shouldNotify = false;

    if (oldCall.status === 'ringing' && newCall.status === 'answered') {
      title = '✅ Call Answered';
      shouldNotify = true;
    } else if (oldCall.status === 'ringing' && newCall.status === 'completed') {
      title = '❌ Call Missed';
      shouldNotify = true;
    } else if (newCall.status === 'completed' && newCall.duration_seconds) {
      title = '📞 Call Completed';
      shouldNotify = true;
    }

    if (shouldNotify) {
      const monitoredPhone = getMonitoredPhoneForCall(newCall, aircallIntegration);
      const description = `Call with ${newCall.customer_phone}${monitoredPhone ? ` on ${monitoredPhone.phoneNumber.label}` : ''}`;
      
      toast({
        title,
        description: (
          <div className="space-y-2">
            <p>{description}</p>
            {newCall.duration_seconds && (
              <div className="text-sm text-muted-foreground">
                Duration: {Math.floor(newCall.duration_seconds / 60)}:{(newCall.duration_seconds % 60).toString().padStart(2, '0')}
              </div>
            )}
            <Button
              size="sm"
              onClick={() => navigateToCall(newCall.id)}
              className="h-8"
            >
              View Details
            </Button>
          </div>
        ),
        duration: 5000,
      });
    }
  };

  const navigateToCall = (callId: string) => {
    console.log('[CallNotifications] 📍 Navigating to call:', callId);
    navigate(`/voice?c=${callId}`);
  };

  const handleCallbackAction = async (callId: string) => {
    // Handle callback scheduling
    console.log('Schedule callback for call:', callId);
    toast({
      title: "Callback Scheduled",
      description: "The callback has been added to your queue",
    });
  };

  const handleVoicemailAction = (callId: string) => {
    // Handle voicemail listening
    console.log('Listen to voicemail for call:', callId);
    toast({
      title: "Opening Voicemail",
      description: "Loading voicemail player...",
    });
  };

  const handleQuickNote = (callId: string) => {
    // Handle quick note adding
    console.log('Add quick note for call:', callId);
    toast({
      title: "Quick Note",
      description: "Opening note editor...",
    });
  };

  const closeIncomingCallModal = () => {
    setIsIncomingCallModalOpen(false);
    setIncomingCall(null);
  };

  return {
    // Modal state
    incomingCall,
    isIncomingCallModalOpen,
    closeIncomingCallModal,
    // Utility functions
    navigateToCall,
    handleCallbackAction,
    handleVoicemailAction,
    handleQuickNote
  };
};