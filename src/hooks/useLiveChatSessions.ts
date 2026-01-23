import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChatSession {
  id: string;
  conversationId: string;
  visitorName: string | null;
  visitorEmail: string | null;
  status: 'waiting' | 'active' | 'ended' | 'abandoned';
  startedAt: string;
  lastMessageAt: string;
  assignedAgentId: string | null;
}

// Track if we've already shown notification for a session
const notifiedSessions = new Set<string>();

export function useLiveChatSessions(organizationId: string | null) {
  const [waitingSessions, setWaitingSessions] = useState<ChatSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const previousWaitingCountRef = useRef(0);
  const originalTitleRef = useRef(document.title);

  const fetchSessions = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    try {
      // Query sessions with widget config to filter by organization
      const { data, error } = await supabase
        .from('widget_chat_sessions')
        .select(`
          id,
          conversation_id,
          visitor_name,
          visitor_email,
          status,
          started_at,
          last_message_at,
          assigned_agent_id,
          widget_config_id,
          widget_configs!inner(organization_id)
        `)
        .eq('widget_configs.organization_id', organizationId)
        .in('status', ['waiting', 'active'])
        .order('started_at', { ascending: false });

      if (error) {
        console.error('[useLiveChatSessions] Error fetching sessions:', error);
        setIsLoading(false);
        return;
      }

      if (data) {
        const mapped = data.map((s: any) => ({
          id: s.id,
          conversationId: s.conversation_id,
          visitorName: s.visitor_name,
          visitorEmail: s.visitor_email,
          status: s.status,
          startedAt: s.started_at,
          lastMessageAt: s.last_message_at,
          assignedAgentId: s.assigned_agent_id,
        }));

        const waiting = mapped.filter(s => s.status === 'waiting');
        const active = mapped.filter(s => s.status === 'active');
        
        // Check for new waiting sessions and notify
        waiting.forEach(session => {
          if (!notifiedSessions.has(session.id)) {
            notifiedSessions.add(session.id);
            // Only show toast if this isn't the first load
            if (previousWaitingCountRef.current > 0 || waitingSessions.length > 0) {
              toast.info('New live chat waiting', {
                description: session.visitorName || 'A visitor is waiting for assistance',
                duration: 5000,
              });
              
              // Try to play notification sound
              try {
                const audio = new Audio('/sounds/chat-notification.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {
                  // Sound blocked or file not found, ignore
                });
              } catch {
                // Audio not supported
              }
            }
          }
        });
        
        setWaitingSessions(waiting);
        setActiveSessions(active);
      }
    } catch (err) {
      console.error('[useLiveChatSessions] Unexpected error:', err);
    }

    setIsLoading(false);
  }, [organizationId]);

  const claimSession = useCallback(async (sessionId: string, agentId: string) => {
    // Use atomic claiming: only succeed if session is still 'waiting' and unassigned
    // This prevents race conditions when multiple agents try to claim simultaneously
    const { data, error } = await supabase
      .from('widget_chat_sessions')
      .update({ 
        assigned_agent_id: agentId, 
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('status', 'waiting')
      .is('assigned_agent_id', null)
      .select('id');

    if (error) {
      console.error('[useLiveChatSessions] Error claiming session:', error);
      return false;
    }
    
    // If no rows updated, session was already claimed by another agent
    if (!data || data.length === 0) {
      console.log('[useLiveChatSessions] Session already claimed by another agent');
      return false;
    }

    fetchSessions();
    return true;
  }, [fetchSessions]);

  const endSession = useCallback(async (sessionId: string) => {
    const { error } = await supabase
      .from('widget_chat_sessions')
      .update({ 
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (!error) {
      fetchSessions();
    }
    return !error;
  }, [fetchSessions]);

  // Fetch sessions and poll
  useEffect(() => {
    fetchSessions();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  // Update browser tab title with waiting count
  useEffect(() => {
    if (waitingSessions.length > 0) {
      document.title = `(${waitingSessions.length}) ${originalTitleRef.current}`;
    } else {
      document.title = originalTitleRef.current;
    }
    
    // Track count for next comparison
    previousWaitingCountRef.current = waitingSessions.length;
    
    return () => {
      document.title = originalTitleRef.current;
    };
  }, [waitingSessions.length]);

  return {
    waitingSessions,
    activeSessions,
    isLoading,
    claimSession,
    endSession,
    refetch: fetchSessions,
  };
}
