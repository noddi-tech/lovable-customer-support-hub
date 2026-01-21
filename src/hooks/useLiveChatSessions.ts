import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export function useLiveChatSessions(organizationId: string | null) {
  const [waitingSessions, setWaitingSessions] = useState<ChatSession[]>([]);
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

        setWaitingSessions(mapped.filter(s => s.status === 'waiting'));
        setActiveSessions(mapped.filter(s => s.status === 'active'));
      }
    } catch (err) {
      console.error('[useLiveChatSessions] Unexpected error:', err);
    }

    setIsLoading(false);
  }, [organizationId]);

  const claimSession = useCallback(async (sessionId: string, agentId: string) => {
    const { error } = await supabase
      .from('widget_chat_sessions')
      .update({ 
        assigned_agent_id: agentId, 
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (!error) {
      fetchSessions();
    }
    return !error;
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

  useEffect(() => {
    fetchSessions();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  return {
    waitingSessions,
    activeSessions,
    isLoading,
    claimSession,
    endSession,
    refetch: fetchSessions,
  };
}
