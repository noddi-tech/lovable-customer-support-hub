import { useState, useEffect, useCallback, useRef } from 'react';
import { getChatMessages } from '../api';
import type { ChatMessage, ChatSessionStatus } from '../types';

interface UseWidgetPollingResult {
  messages: ChatMessage[];
  agentTyping: boolean;
  sessionStatus: ChatSessionStatus;
  assignedAgentName: string | null;
  isConnected: boolean;
  refetch: () => void;
}

export function useWidgetPolling(sessionId: string | null): UseWidgetPollingResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentTyping, setAgentTyping] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<ChatSessionStatus>('waiting');
  const [assignedAgentName, setAssignedAgentName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const lastMessageTimestamp = useRef<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const errorCountRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return;

    try {
      const response = await fetch(
        `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/widget-chat?sessionId=${encodeURIComponent(sessionId)}${lastMessageTimestamp.current ? `&since=${encodeURIComponent(lastMessageTimestamp.current)}` : ''}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      
      setIsConnected(true);
      errorCountRef.current = 0;

      // Update messages if we got new ones
      if (data.messages && data.messages.length > 0) {
        if (lastMessageTimestamp.current) {
          // Append new messages
          setMessages(prev => {
            const newIds = new Set(prev.map(m => m.id));
            const newMessages = data.messages.filter((m: ChatMessage) => !newIds.has(m.id));
            return [...prev, ...newMessages];
          });
        } else {
          // Initial load
          setMessages(data.messages);
        }
        
        // Update last timestamp
        const lastMessage = data.messages[data.messages.length - 1];
        if (lastMessage) {
          lastMessageTimestamp.current = lastMessage.createdAt;
        }
      }

      // Update other state
      setAgentTyping(data.agentTyping || false);
      setSessionStatus(data.status || 'waiting');
      setAssignedAgentName(data.assignedAgentName || null);

    } catch (error) {
      console.error('[Noddi Widget] Polling error:', error);
      errorCountRef.current++;
      
      // After 3 consecutive errors, mark as disconnected
      if (errorCountRef.current >= 3) {
        setIsConnected(false);
      }
    }
  }, [sessionId]);

  const refetch = useCallback(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Set up polling
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      setAgentTyping(false);
      setSessionStatus('waiting');
      setAssignedAgentName(null);
      lastMessageTimestamp.current = null;
      return;
    }

    // Initial fetch
    fetchMessages();

    // Set up interval - poll every 3 seconds
    pollIntervalRef.current = window.setInterval(fetchMessages, 3000);

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [sessionId, fetchMessages]);

  // Stop polling if chat ended
  useEffect(() => {
    if (sessionStatus === 'ended' || sessionStatus === 'abandoned') {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [sessionStatus]);

  return {
    messages,
    agentTyping,
    sessionStatus,
    assignedAgentName,
    isConnected,
    refetch,
  };
}
