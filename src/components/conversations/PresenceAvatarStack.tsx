import React, { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConversationPresenceSafe, PresenceUser } from '@/contexts/ConversationPresenceContext';
import { useConversationTypingStatus } from '@/hooks/useConversationTypingStatus';
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
}) => {
  const presenceContext = useConversationPresenceSafe();
  const typingUserIds = useConversationTypingStatus(conversationId);

  // If no presence context (provider not mounted yet), return null
  if (!presenceContext) return null;

  const { viewersForConversation, currentUserProfile } = presenceContext;
  const allViewers = viewersForConversation(conversationId);

  // Sort viewers: current user first, then others
  const sortedViewers = [...allViewers].sort((a, b) => {
    if (a.user_id === currentUserProfile?.user_id) return -1;
    if (b.user_id === currentUserProfile?.user_id) return 1;
    return 0;
  });

  // No viewers at all
  if (sortedViewers.length === 0) return null;

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

// Re-export the PresenceUser type for convenience
export type { PresenceUser };
