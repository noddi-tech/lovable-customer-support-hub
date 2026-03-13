import React, { memo, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConversationPresenceSafe, PresenceUser } from '@/contexts/ConversationPresenceContext';
import { useConversationTypingStatus } from '@/hooks/useConversationTypingStatus';
import { useTypingUsersWithProfiles } from '@/hooks/useTypingUsersWithProfiles';
import { AgentActivityAvatar } from './AgentActivityAvatar';
import { cn } from '@/lib/utils';

interface PresenceAvatarStackProps {
  conversationId: string;
  maxAvatars?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSelfFallback?: boolean;
}

const overlapClasses = {
  sm: '-ml-1.5',
  md: '-ml-2',
  lg: '-ml-2.5',
};

const sizeClasses = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-9 w-9 text-sm',
};

export const PresenceAvatarStack = memo<PresenceAvatarStackProps>(({
  conversationId,
  maxAvatars = 3,
  size = 'sm',
  className,
  showSelfFallback = false,
}) => {
  const presenceContext = useConversationPresenceSafe();
  const typingUserIds = useConversationTypingStatus(conversationId);
  const typingUsersWithProfiles = useTypingUsersWithProfiles(conversationId);

  const currentUserProfile = presenceContext?.currentUserProfile ?? null;
  const presenceViewers = presenceContext?.viewersForConversation(conversationId) ?? [];

  // Merge: start with presence viewers, then add any typing users not already present
  const mergedViewers = useMemo(() => {
    const viewerMap = new Map<string, PresenceUser>();
    presenceViewers.forEach((v) => viewerMap.set(v.user_id, v));
    typingUsersWithProfiles.forEach((tp) => {
      if (!viewerMap.has(tp.user_id)) {
        viewerMap.set(tp.user_id, {
          user_id: tp.user_id,
          full_name: tp.full_name,
          avatar_url: tp.avatar_url,
          email: tp.email,
          conversation_id: conversationId,
          entered_at: new Date().toISOString(),
        });
      }
    });
    return Array.from(viewerMap.values());
  }, [presenceViewers, typingUsersWithProfiles, conversationId]);

  // Sort viewers: current user first, then others
  const sortedViewers = useMemo(() => {
    return [...mergedViewers].sort((a, b) => {
      if (a.user_id === currentUserProfile?.user_id) return -1;
      if (b.user_id === currentUserProfile?.user_id) return 1;
      return 0;
    });
  }, [mergedViewers, currentUserProfile?.user_id]);

  // No context = provider not mounted
  if (!presenceContext) return null;

  // No viewers — show self-fallback if enabled
  if (sortedViewers.length === 0) {
    if (showSelfFallback && currentUserProfile) {
      const selfTyping = typingUserIds.has(currentUserProfile.user_id);
      return (
        <div className={cn('flex items-center', className)}>
          <AgentActivityAvatar
            user={currentUserProfile}
            isTyping={selfTyping}
            isCurrentUser={true}
            size={size}
          />
        </div>
      );
    }
    return null;
  }

  const visibleViewers = sortedViewers.slice(0, maxAvatars);
  const overflowCount = sortedViewers.length - maxAvatars;

  return (
    <div className={cn('flex items-center', className)}>
      {visibleViewers.map((viewer, index) => (
        <div key={viewer.user_id} className={cn(index > 0 && overlapClasses[size])}>
          <AgentActivityAvatar
            user={viewer}
            isTyping={typingUserIds.has(viewer.user_id)}
            isCurrentUser={viewer.user_id === currentUserProfile?.user_id}
            size={size}
          />
        </div>
      ))}

      {overflowCount > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                sizeClasses[size],
                overlapClasses[size],
                'rounded-full bg-muted flex items-center justify-center ring-2 ring-background font-medium text-muted-foreground cursor-default'
              )}
            >
              +{overflowCount}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {sortedViewers.slice(maxAvatars).map((viewer) => (
              <p key={viewer.user_id}>{viewer.full_name}</p>
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

PresenceAvatarStack.displayName = 'PresenceAvatarStack';

export type { PresenceUser };
