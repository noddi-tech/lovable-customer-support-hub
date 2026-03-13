import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [isProfileReady, setIsProfileReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const currentConversationRef = useRef<string | null>(null);
  const currentUserProfileRef = useRef<PresenceUser | null>(null);
  const pendingTrackRef = useRef<string | null>(null);

  // Fetch current user's profile for presence data
  useEffect(() => {
    if (!user?.id) {
      setIsProfileReady(false);
      return;
    }

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

        currentUserProfileRef.current = newProfile;
        setCurrentUserProfile(newProfile);
        setIsProfileReady(true);
        console.log('[Presence] Profile ready:', newProfile.user_id, newProfile.full_name);
      }
    };

    fetchProfile();
  }, [user?.id]);

  const updateViewersMap = useCallback((state: PresenceState) => {
    const newMap = new Map<string, PresenceUser[]>();
    Object.values(state).forEach((presences) => {
      presences.forEach((presence) => {
        if (presence.conversation_id) {
          const existing = newMap.get(presence.conversation_id) || [];
          if (!existing.some((p) => p.user_id === presence.user_id)) {
            existing.push(presence);
          }
          newMap.set(presence.conversation_id, existing);
        }
      });
    });
    setViewersMap(newMap);
  }, []);

  // Set up presence channel — re-runs when org, user, or profile readiness changes
  useEffect(() => {
    const profile = currentUserProfileRef.current;

    if (!organizationId || !user?.id) {
      return;
    }

    // Use auth user ID as channel key even before profile fetches (ensures channel exists)
    const channelKey = profile?.user_id ?? user.id;
    const channelName = `presence:org-${organizationId}`;
    console.log('[Presence] Setting up channel:', channelName, '| profileReady:', isProfileReady, '| key:', channelKey);

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: channelKey,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>();
        console.log('[Presence] Sync — users:', Object.keys(state).length);
        updateViewersMap(state);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        console.log('[Presence] Join:', key);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        console.log('[Presence] Leave:', key);
      })
      .subscribe(async (status) => {
        console.log('[Presence] Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          const p = currentUserProfileRef.current;
          const trackPayload = p
            ? { ...p, conversation_id: currentConversationRef.current, entered_at: new Date().toISOString() }
            : { user_id: user.id, full_name: '', email: '', conversation_id: currentConversationRef.current, entered_at: new Date().toISOString() };

          await channel.track(trackPayload);
          console.log('[Presence] Initial track done, conversation:', currentConversationRef.current);

          // Process any queued track
          if (pendingTrackRef.current) {
            const pendingId = pendingTrackRef.current;
            pendingTrackRef.current = null;
            console.log('[Presence] Processing queued track for:', pendingId);
            channel.track({ ...trackPayload, conversation_id: pendingId });
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[Presence] Channel error/closed:', status);
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('[Presence] Cleaning up channel:', channelName);
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
    };
  }, [organizationId, user?.id, isProfileReady, updateViewersMap]);

  // When profile arrives after channel is already connected, re-track with full data
  useEffect(() => {
    const channel = channelRef.current;
    const profile = currentUserProfileRef.current;
    if (!channel || !profile || !isConnected) return;

    console.log('[Presence] Profile enrichment re-track');
    channel.track({
      ...profile,
      conversation_id: currentConversationRef.current,
      entered_at: new Date().toISOString(),
    });
  }, [isProfileReady, isConnected]);

  const trackConversation = useCallback(async (conversationId: string) => {
    const profile = currentUserProfileRef.current;
    const channel = channelRef.current;

    currentConversationRef.current = conversationId;

    if (!channel) {
      console.log('[Presence] trackConversation: no channel yet, queueing:', conversationId);
      pendingTrackRef.current = conversationId;
      return;
    }

    try {
      const payload = profile
        ? { ...profile, conversation_id: conversationId, entered_at: new Date().toISOString() }
        : { user_id: '', full_name: '', email: '', conversation_id: conversationId, entered_at: new Date().toISOString() };
      await channel.track(payload);
      console.log('[Presence] Tracked conversation:', conversationId);
    } catch (error) {
      console.error('[Presence] trackConversation failed:', error);
      pendingTrackRef.current = conversationId;
    }
  }, []);

  const untrackConversation = useCallback(async () => {
    const profile = currentUserProfileRef.current;
    const channel = channelRef.current;

    currentConversationRef.current = null;
    pendingTrackRef.current = null;

    if (!channel || !profile) return;

    try {
      await channel.track({
        ...profile,
        conversation_id: null,
        entered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Presence] untrackConversation failed:', error);
    }
  }, []);

  return {
    viewersMap,
    currentUserProfile,
    trackConversation,
    untrackConversation,
    isConnected,
  };
}
