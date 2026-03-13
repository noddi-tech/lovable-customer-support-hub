import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface AgentActivityAvatarUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  email: string;
}

interface AgentActivityAvatarProps {
  user: AgentActivityAvatarUser;
  isTyping?: boolean;
  isCurrentUser?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-7 w-7 text-xs',
  lg: 'h-9 w-9 text-sm',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const AgentActivityAvatar = memo<AgentActivityAvatarProps>(
  ({ user, isTyping = false, isCurrentUser = false, size = 'sm', className }) => {
    const statusLabel = isTyping ? 'Responding' : 'Viewing';

    // Ring color: amber pulsing when typing, green when viewing
    const ringClass = isTyping
      ? 'ring-amber-500 animate-pulse'
      : 'ring-green-500';

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar
            className={cn(
              sizeClasses[size],
              'ring-2 cursor-default',
              ringClass,
              className,
            )}
          >
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">
            {user.full_name}
            {isCurrentUser && (
              <span className="text-muted-foreground ml-1">(You)</span>
            )}
          </p>
          <p className="text-muted-foreground">{user.email}</p>
          <p className={cn('text-xs mt-0.5', isTyping ? 'text-amber-500' : 'text-green-500')}>
            ● {statusLabel}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  },
);

AgentActivityAvatar.displayName = 'AgentActivityAvatar';
