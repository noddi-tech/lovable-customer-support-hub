import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useConversationPresenceSafe, PresenceUser } from '@/contexts/ConversationPresenceContext';
import { cn } from '@/lib/utils';

interface PresenceAvatarStackProps {
  conversationId: string;
  maxAvatars?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-9 w-9 text-sm',
};

const overlapClasses = {
  sm: '-ml-1.5',
  md: '-ml-2',
  lg: '-ml-2.5',
};

export const PresenceAvatarStack = memo<PresenceAvatarStackProps>(({
  conversationId,
  maxAvatars = 3,
  size = 'sm',
  className,
}) => {
  const presenceContext = useConversationPresenceSafe();
  
  // If no presence context (provider not mounted yet), return null
  if (!presenceContext) return null;
  
  const { viewersForConversation, currentUserProfile } = presenceContext;
  const allViewers = viewersForConversation(conversationId);
  
  // Filter out current user
  const otherViewers = allViewers.filter(
    (viewer) => viewer.user_id !== currentUserProfile?.user_id
  );

  // No other viewers, don't render anything
  if (otherViewers.length === 0) return null;

  const visibleViewers = otherViewers.slice(0, maxAvatars);
  const overflowCount = otherViewers.length - maxAvatars;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={cn('flex items-center', className)}>
      {visibleViewers.map((viewer, index) => (
        <Tooltip key={viewer.user_id}>
          <TooltipTrigger asChild>
            <Avatar
              className={cn(
                sizeClasses[size],
                index > 0 && overlapClasses[size],
                'ring-2 ring-background cursor-default'
              )}
            >
              {viewer.avatar_url && (
                <AvatarImage src={viewer.avatar_url} alt={viewer.full_name} />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {getInitials(viewer.full_name)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p className="font-medium">{viewer.full_name}</p>
            <p className="text-muted-foreground">{viewer.email}</p>
          </TooltipContent>
        </Tooltip>
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
            {otherViewers.slice(maxAvatars).map((viewer) => (
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
