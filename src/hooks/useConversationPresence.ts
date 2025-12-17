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
    if (!user?.id) {
      logger.debug('No user ID, skipping profile fetch', undefined, 'Presence');
      return;
    }

    const fetchProfile = async () => {
      logger.debug('Fetching profile for user', { userId: user.id }, 'Presence');
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, email')
        .eq('user_id', user.id)
        .single();

      if (error) {
        logger.error('Error fetching profile', error, 'Presence');
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
        
        logger.debug('Profile fetched successfully', { 
          userId: newProfile.user_id, 
          fullName: newProfile.full_name 
        }, 'Presence');
        
        // Only update state if profile user_id changed (avoid reference changes)
        if (!currentUserProfileRef.current || currentUserProfileRef.current.user_id !== newProfile.user_id) {
          currentUserProfileRef.current = newProfile;
          isProfileReadyRef.current = true;
          setCurrentUserProfile(newProfile);
          logger.debug('Profile state updated', undefined, 'Presence');
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
    logger.debug('Channel setup effect triggered', { 
      organizationId, 
      hasProfile: !!currentUserProfile,
      profileUserId: currentUserProfile?.user_id 
    }, 'Presence');
    
    // Use currentUserProfile state (not ref) for reliable React dependency tracking
    if (!organizationId || !currentUserProfile) {
      logger.debug('Skipping channel setup - missing dependencies', { 
        hasOrgId: !!organizationId, 
        hasProfile: !!currentUserProfile 
      }, 'Presence');
      return;
    }

    const channelName = `presence:org-${organizationId}`;
    logger.debug('Setting up presence channel', { channelName }, 'Presence');

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
        logger.debug('Presence sync event', { 
          stateKeys: Object.keys(state),
          userCount: Object.values(state).flat().length
        }, 'Presence');
        updateViewersMap(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug('Presence join event', { key, newPresences }, 'Presence');
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug('Presence leave event', { key, leftPresences }, 'Presence');
      })
      .subscribe(async (status) => {
        logger.debug('Channel subscription status', { status }, 'Presence');
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          logger.debug('Channel SUBSCRIBED, tracking initial state', { 
            conversationId: currentConversationRef.current 
          }, 'Presence');
          
          // Track initial state
          await channel.track({
            ...currentUserProfile,
            conversation_id: currentConversationRef.current,
            entered_at: new Date().toISOString(),
          });
          logger.debug('Initial track completed', undefined, 'Presence');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          logger.warn('Channel disconnected', { status }, 'Presence');
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    return () => {
      logger.debug('Cleaning up presence channel', { channelName }, 'Presence');
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
      
      logger.debug('trackConversation called', { 
        conversationId, 
        hasChannel: !!channel, 
        hasProfile: !!profile,
        channelState: channel ? 'exists' : 'null'
      }, 'Presence');
      
      if (!channel || !profile) {
        logger.warn('trackConversation early return - missing dependencies', { 
          hasChannel: !!channel, 
          hasProfile: !!profile 
        }, 'Presence');
        return;
      }

      currentConversationRef.current = conversationId;

      try {
        await channel.track({
          ...profile,
          conversation_id: conversationId,
          entered_at: new Date().toISOString(),
        });
        logger.debug('trackConversation completed successfully', { conversationId }, 'Presence');
      } catch (error) {
        logger.error('trackConversation failed', error, 'Presence');
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
