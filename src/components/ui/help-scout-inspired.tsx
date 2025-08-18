import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

// Help Scout inspired conversation row component
interface ConversationRowProps {
  conversation: {
    id: string;
    subject: string;
    customer_name: string;
    customer_email: string;
    last_message_at: string;
    status: string;
    priority: string;
    unread_count: number;
    assigned_to?: string;
    channel: string;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

export const ConversationRow: React.FC<ConversationRowProps> = ({
  conversation,
  isSelected,
  onClick
}) => {
  const getStatusBadge = (status: string) => {
    const variants = {
      'open': 'default',
      'pending': 'secondary',
      'closed': 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      'high': 'text-red-600',
      'medium': 'text-yellow-600',
      'low': 'text-green-600'
    } as const;
    
    return colors[priority as keyof typeof colors] || 'text-muted-foreground';
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 border-b hover:bg-muted/50 cursor-pointer transition-colors",
        "group relative focus:outline-none focus:ring-2 focus:ring-primary/50",
        isSelected && "bg-primary/5 border-l-4 border-l-primary"
      )}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`Conversation with ${conversation.customer_name}: ${conversation.subject}`}
    >
      {/* Customer Avatar */}
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${conversation.customer_name}`} />
        <AvatarFallback className="text-xs">
          {conversation.customer_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Conversation Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate max-w-[200px]">
              {conversation.customer_name}
            </span>
            {conversation.unread_count > 0 && (
              <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(conversation.status)}
            <span className={cn("text-xs", getPriorityColor(conversation.priority))}>
              {conversation.priority}
            </span>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground truncate mb-1">
          {conversation.subject}
        </div>
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{conversation.channel}</span>
          <span>{format(new Date(conversation.last_message_at), 'MMM d, h:mm a')}</span>
        </div>
      </div>

      {/* Hover Actions */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <span className="sr-only">Quick assign</span>
          👤
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <span className="sr-only">Archive</span>
          📁
        </Button>
      </div>
    </div>
  );
};

// Help Scout inspired inbox sidebar item
interface InboxItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
}

export const InboxItem: React.FC<InboxItemProps> = ({
  icon,
  label,
  count,
  isActive,
  onClick
}) => {
  return (
    <button
      className={cn(
        "flex items-center justify-between w-full p-2 rounded-md text-left transition-colors",
        "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50",
        isActive && "bg-primary/10 text-primary font-medium"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <Badge variant={isActive ? "default" : "secondary"} className="h-5 text-xs">
          {count > 99 ? '99+' : count}
        </Badge>
      )}
    </button>
  );
};