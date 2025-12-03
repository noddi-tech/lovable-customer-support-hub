import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

export interface PresenceUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
  conversation_id: string | null;
  entered_at: string;
}

export interface PresenceState {
  [key: string]: PresenceUser[];
}

interface UseConversationPresenceReturn {
  viewersMap: Map<string, PresenceUser[]>;
  currentUserProfile: PresenceUser | null;
  trackConversation: (conversationId: string) => void;
  untrackConversation: () => void;
  isConnected: boolean;
}

export function useConversationPresence(organizationId?: string): UseConversationPresenceReturn {
  const { user } = useAuth();
  const [viewersMap, setViewersMap] = useState<Map<string, PresenceUser[]>>(new Map());
  const [currentUserProfile, setCurrentUserProfile] = useState<PresenceUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentConversationRef = useRef<string | null>(null);

  // Fetch current user's profile for presence data
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, email')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('[Presence] Error fetching profile:', error);
        return;
      }

      if (data) {
        setCurrentUserProfile({
          user_id: data.user_id,
          full_name: data.full_name,
          avatar_url: data.avatar_url || undefined,
          email: data.email,
          conversation_id: null,
          entered_at: new Date().toISOString(),
        });
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Set up presence channel
  useEffect(() => {
    if (!organizationId || !currentUserProfile) return;

    const channelName = `presence:org-${organizationId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: currentUserProfile.user_id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        updateViewersMap(state);
        logger.debug('Presence sync', { userCount: Object.keys(state).length }, 'Presence');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug('Presence join', { key, count: newPresences.length }, 'Presence');
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug('Presence leave', { key, count: leftPresences.length }, 'Presence');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track initial state (not viewing any conversation)
          await channel.track({
            ...currentUserProfile,
            conversation_id: currentConversationRef.current,
            entered_at: new Date().toISOString(),
          });
          logger.debug('Presence subscribed and tracking', {}, 'Presence');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      logger.debug('Cleaning up presence channel', {}, 'Presence');
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [organizationId, currentUserProfile]);

  const updateViewersMap = useCallback((state: PresenceState) => {
    const newMap = new Map<string, PresenceUser[]>();

    // Group users by conversation_id
    Object.values(state).forEach((presences) => {
      presences.forEach((presence) => {
        if (presence.conversation_id) {
          const existing = newMap.get(presence.conversation_id) || [];
          // Avoid duplicates
          if (!existing.some((p) => p.user_id === presence.user_id)) {
            existing.push(presence);
          }
          newMap.set(presence.conversation_id, existing);
        }
      });
    });

    setViewersMap(newMap);
  }, []);

  const trackConversation = useCallback(
    async (conversationId: string) => {
      if (!channelRef.current || !currentUserProfile) return;

      currentConversationRef.current = conversationId;

      await channelRef.current.track({
        ...currentUserProfile,
        conversation_id: conversationId,
        entered_at: new Date().toISOString(),
      });

      logger.debug('Tracking conversation', { conversationId }, 'Presence');
    },
    [currentUserProfile]
  );

  const untrackConversation = useCallback(async () => {
    if (!channelRef.current || !currentUserProfile) return;

    currentConversationRef.current = null;

    await channelRef.current.track({
      ...currentUserProfile,
      conversation_id: null,
      entered_at: new Date().toISOString(),
    });

    logger.debug('Untracked conversation', {}, 'Presence');
  }, [currentUserProfile]);

  return {
    viewersMap,
    currentUserProfile,
    trackConversation,
    untrackConversation,
    isConnected,
  };
}
