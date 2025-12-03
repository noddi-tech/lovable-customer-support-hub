import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useConversationPresence, PresenceUser } from '@/hooks/useConversationPresence';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthContext';

// Re-export PresenceUser for consumers
export type { PresenceUser };

// Stable empty array to prevent reference changes
const EMPTY_VIEWERS: PresenceUser[] = [];

interface ConversationPresenceContextType {
  viewersForConversation: (conversationId: string) => PresenceUser[];
  trackConversation: (conversationId: string) => void;
  untrackConversation: () => void;
  currentUserProfile: PresenceUser | null;
  isConnected: boolean;
}

const ConversationPresenceContext = createContext<ConversationPresenceContextType | undefined>(undefined);

export const useConversationPresenceContext = () => {
  const context = useContext(ConversationPresenceContext);
  if (!context) {
    throw new Error('useConversationPresenceContext must be used within ConversationPresenceProvider');
  }
  return context;
};

// Safe hook that returns null values if used outside the provider
export const useConversationPresenceSafe = () => {
  return useContext(ConversationPresenceContext);
};

export const ConversationPresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);

  // Fetch organization ID for the current user
  useEffect(() => {
    if (!user?.id) {
      setOrganizationId(undefined);
      return;
    }

    const fetchOrgId = async () => {
      const { data, error } = await supabase.rpc('get_user_organization_id');
      if (data && !error) {
        setOrganizationId(data);
      }
    };

    fetchOrgId();
  }, [user?.id]);

  const {
    viewersMap,
    currentUserProfile,
    trackConversation,
    untrackConversation,
    isConnected,
  } = useConversationPresence(organizationId);

  // Memoize to prevent infinite re-renders - use stable empty array
  const viewersForConversation = useCallback(
    (conversationId: string): PresenceUser[] => {
      return viewersMap.get(conversationId) ?? EMPTY_VIEWERS;
    },
    [viewersMap]
  );

  const contextValue = useMemo(
    () => ({
      viewersForConversation,
      trackConversation,
      untrackConversation,
      currentUserProfile,
      isConnected,
    }),
    [viewersForConversation, trackConversation, untrackConversation, currentUserProfile, isConnected]
  );

  return (
    <ConversationPresenceContext.Provider value={contextValue}>
      {children}
    </ConversationPresenceContext.Provider>
  );
};
