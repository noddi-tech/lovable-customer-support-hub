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
  const currentUserProfileRef = useRef<PresenceUser | null>(null);
  const isProfileReadyRef = useRef(false);

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
        const newProfile: PresenceUser = {
          user_id: data.user_id,
          full_name: data.full_name,
          avatar_url: data.avatar_url || undefined,
          email: data.email,
          conversation_id: null,
          entered_at: new Date().toISOString(),
        };
        
        // Only update state if profile user_id changed (avoid reference changes)
        if (!currentUserProfileRef.current || currentUserProfileRef.current.user_id !== newProfile.user_id) {
          currentUserProfileRef.current = newProfile;
          isProfileReadyRef.current = true;
          setCurrentUserProfile(newProfile);
        }
      }
    };

    fetchProfile();
  }, [user?.id]);

  // Set up presence channel - only depends on organizationId
  useEffect(() => {
    if (!organizationId || !isProfileReadyRef.current || !currentUserProfileRef.current) return;

    const profile = currentUserProfileRef.current;
    const channelName = `presence:org-${organizationId}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: profile.user_id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        updateViewersMap(state);
      })
      .on('presence', { event: 'join' }, () => {})
      .on('presence', { event: 'leave' }, () => {})
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          // Track initial state using ref
          const currentProfile = currentUserProfileRef.current;
          if (currentProfile) {
            await channel.track({
              ...currentProfile,
              conversation_id: currentConversationRef.current,
              entered_at: new Date().toISOString(),
            });
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [organizationId, currentUserProfile]); // Keep currentUserProfile to trigger on first load only

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

  // Stable callbacks using refs - no dependencies that change
  const trackConversation = useCallback(
    async (conversationId: string) => {
      const profile = currentUserProfileRef.current;
      if (!channelRef.current || !profile) return;

      currentConversationRef.current = conversationId;

      await channelRef.current.track({
        ...profile,
        conversation_id: conversationId,
        entered_at: new Date().toISOString(),
      });
    },
    [] // No dependencies - uses refs
  );

  const untrackConversation = useCallback(async () => {
    const profile = currentUserProfileRef.current;
    if (!channelRef.current || !profile) return;

    currentConversationRef.current = null;

    await channelRef.current.track({
      ...profile,
      conversation_id: null,
      entered_at: new Date().toISOString(),
    });
  }, []); // No dependencies - uses refs

  return {
    viewersMap,
    currentUserProfile,
    trackConversation,
    untrackConversation,
    isConnected,
  };
}
