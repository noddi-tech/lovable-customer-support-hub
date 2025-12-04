import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Check, 
  Trash2, 
  ExternalLink,
  Bell,
  AlertTriangle,
  UserCheck,
  AtSign,
  Phone,
  MessageSquare,
  Ticket,
  Settings,
  Circle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { EnhancedNotification, NotificationPriority } from '@/hooks/useNotificationFilters';

interface NotificationListItemProps {
  notification: EnhancedNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (notification: EnhancedNotification) => void;
}

const priorityConfig: Record<NotificationPriority, { color: string; label: string }> = {
  urgent: { color: 'bg-destructive', label: 'Urgent' },
  high: { color: 'bg-warning', label: 'High' },
  normal: { color: 'bg-primary', label: 'Normal' },
  low: { color: 'bg-muted-foreground', label: 'Low' },
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'urgent': return AlertTriangle;
    case 'assigned': return UserCheck;
    case 'mentions': return AtSign;
    case 'calls': return Phone;
    case 'conversations': return MessageSquare;
    case 'tickets': return Ticket;
    case 'system': return Settings;
    default: return Bell;
  }
};

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
}) => {
  const Icon = getCategoryIcon(notification.category);
  const priority = priorityConfig[notification.priority];
  const hasLink = notification.data?.conversation_id || notification.data?.ticket_id || notification.data?.call_id;

  return (
    <div
      className={cn(
        "group relative flex items-start gap-4 p-4 border-b border-border transition-colors",
        !notification.is_read && "bg-muted/30",
        "hover:bg-muted/50"
      )}
    >
      {/* Priority indicator line */}
      <div 
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1 rounded-l",
          notification.priority === 'urgent' && "bg-destructive",
          notification.priority === 'high' && "bg-warning",
          notification.priority === 'normal' && !notification.is_read && "bg-primary",
        )} 
      />
      
      {/* Icon */}
      <div className={cn(
        "shrink-0 h-10 w-10 rounded-full flex items-center justify-center",
        notification.priority === 'urgent' ? "bg-destructive/10 text-destructive" :
        notification.priority === 'high' ? "bg-warning/10 text-warning" :
        "bg-muted text-muted-foreground"
      )}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={cn(
              "text-sm font-medium",
              !notification.is_read && "text-foreground",
              notification.is_read && "text-muted-foreground"
            )}>
              {notification.title}
            </h4>
            {!notification.is_read && (
              <Circle className="h-2 w-2 fill-primary text-primary" />
            )}
            {notification.priority === 'urgent' && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                Urgent
              </Badge>
            )}
            {notification.category === 'assigned' && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                Assigned to you
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>
        
        <p className={cn(
          "text-sm mt-1 line-clamp-2",
          notification.is_read ? "text-muted-foreground" : "text-foreground/80"
        )}>
          {notification.message}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.is_read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsRead(notification.id);
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark as read
            </Button>
          )}
          {hasLink && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(notification);
              }}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};
