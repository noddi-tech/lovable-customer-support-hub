import { useEffect, useRef, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useConversationTypingStatus } from '@/hooks/useConversationTypingStatus';
import { useAuth } from '@/components/auth/AuthContext';

export interface TypingUserProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

/**
 * Returns profile data for all users currently typing in a conversation.
 * Uses DB-backed typing status (not presence), so it works even when
 * the WebSocket presence channel is down.
 * 
 * Profiles are cached in a ref to avoid re-fetching on every render.
 */
export function useTypingUsersWithProfiles(conversationId: string | null): TypingUserProfile[] {
  const { user } = useAuth();
  const typingUserIds = useConversationTypingStatus(conversationId);
  const [profiles, setProfiles] = useState<Map<string, TypingUserProfile>>(new Map());
  const profileCacheRef = useRef<Map<string, TypingUserProfile>>(new Map());

  // Fetch profiles for any typing user IDs we haven't cached yet
  useEffect(() => {
    if (typingUserIds.size === 0) return;

    const uncachedIds = Array.from(typingUserIds).filter(
      (id) => !profileCacheRef.current.has(id)
    );

    if (uncachedIds.length === 0) {
      // All cached — just ensure state reflects current typing set
      setProfiles(new Map(profileCacheRef.current));
      return;
    }

    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, email')
        .in('user_id', uncachedIds);

      if (error) {
        console.error('[TypingProfiles] Error fetching profiles:', error);
        return;
      }

      if (data) {
        data.forEach((p) => {
          const profile: TypingUserProfile = {
            user_id: p.user_id,
            full_name: p.full_name,
            avatar_url: p.avatar_url || undefined,
            email: p.email,
          };
          profileCacheRef.current.set(p.user_id, profile);
        });
        setProfiles(new Map(profileCacheRef.current));
      }
    };

    fetchProfiles();
  }, [typingUserIds]);

  // Return only profiles of currently typing users (excluding self)
  return useMemo(() => {
    const result: TypingUserProfile[] = [];
    typingUserIds.forEach((uid) => {
      // Skip self — self-typing is handled separately
      if (uid === user?.id) return;
      const profile = profileCacheRef.current.get(uid);
      if (profile) {
        result.push(profile);
      }
    });
    return result;
  }, [typingUserIds, profiles, user?.id]);
}
