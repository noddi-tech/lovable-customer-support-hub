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
  const pendingTrackRef = useRef<string | null>(null);

  // Fetch current user's profile for presence data
  useEffect(() => {
    if (!user?.id) {
      console.log('[Presence] No user ID, skipping profile fetch');
      return;
    }

    const fetchProfile = async () => {
      console.log('[Presence] Fetching profile for user:', user.id);
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
        
        console.log('[Presence] Profile fetched:', newProfile.user_id, newProfile.full_name);
        
        // Only update state if profile user_id changed (avoid reference changes)
        if (!currentUserProfileRef.current || currentUserProfileRef.current.user_id !== newProfile.user_id) {
          currentUserProfileRef.current = newProfile;
          isProfileReadyRef.current = true;
          setCurrentUserProfile(newProfile);
          console.log('[Presence] Profile state updated');
        }
      }
    };

    fetchProfile();
  }, [user?.id]);

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

  // Set up presence channel - only depends on organizationId and currentUserProfile
  useEffect(() => {
    console.log('[Presence] Channel setup effect triggered', { organizationId, hasProfile: !!currentUserProfile });
    
    if (!organizationId || !currentUserProfile) {
      console.log('[Presence] Skipping channel setup - missing deps', { hasOrgId: !!organizationId, hasProfile: !!currentUserProfile });
      return;
    }

    const channelName = `presence:org-${organizationId}`;
    console.log('[Presence] Setting up channel:', channelName);

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
        console.log('[Presence] Sync event — users:', Object.keys(state), 'total:', Object.values(state).flat().length);
        updateViewersMap(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] Join:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] Leave:', key, leftPresences);
      })
      .subscribe(async (status) => {
        console.log('[Presence] Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('[Presence] Channel SUBSCRIBED, tracking conversation:', currentConversationRef.current);
          
          // Track initial state
          const trackResult = await channel.track({
            ...currentUserProfile,
            conversation_id: currentConversationRef.current,
            entered_at: new Date().toISOString(),
          });
          console.log('[Presence] Initial track result:', trackResult);
          // Process any queued track call
          if (pendingTrackRef.current) {
            const pendingId = pendingTrackRef.current;
            pendingTrackRef.current = null;
            console.log('[Presence] Processing queued track for:', pendingId);
            channel.track({
              ...currentUserProfile,
              conversation_id: pendingId,
              entered_at: new Date().toISOString(),
            });
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.warn('[Presence] Channel disconnected:', status);
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
  }, [organizationId, currentUserProfile, updateViewersMap]);

  // Stable callbacks using refs - no dependencies that change
  const trackConversation = useCallback(
    async (conversationId: string) => {
      const profile = currentUserProfileRef.current;
      const channel = channelRef.current;
      
      console.log('[Presence] trackConversation called:', conversationId, { hasChannel: !!channel, hasProfile: !!profile });
      
      if (!channel || !profile) {
        console.warn('[Presence] trackConversation: channel/profile not ready, queueing:', conversationId);
        pendingTrackRef.current = conversationId;
        currentConversationRef.current = conversationId;
        return;
      }

      currentConversationRef.current = conversationId;

      try {
        const result = await channel.track({
          ...profile,
          conversation_id: conversationId,
          entered_at: new Date().toISOString(),
        });
        console.log('[Presence] trackConversation result:', result, 'for:', conversationId);
      } catch (error) {
        console.error('[Presence] trackConversation failed:', error);
      }
    },
    [] // No dependencies - uses refs
  );

  const untrackConversation = useCallback(async () => {
    const profile = currentUserProfileRef.current;
    const channel = channelRef.current;
    
    logger.debug('untrackConversation called', { 
      hasChannel: !!channel, 
      hasProfile: !!profile 
    }, 'Presence');
    
    if (!channel || !profile) {
      logger.debug('untrackConversation early return', undefined, 'Presence');
      return;
    }

    currentConversationRef.current = null;

    try {
      await channel.track({
        ...profile,
        conversation_id: null,
        entered_at: new Date().toISOString(),
      });
      logger.debug('untrackConversation completed', undefined, 'Presence');
    } catch (error) {
      logger.error('untrackConversation failed', error, 'Presence');
    }
  }, []); // No dependencies - uses refs

  return {
    viewersMap,
    currentUserProfile,
    trackConversation,
    untrackConversation,
    isConnected,
  };
}
