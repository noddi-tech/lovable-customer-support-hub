import React from 'react';
import { cn } from '@/lib/utils';
import { SidebarCounter } from '@/components/ui/sidebar-counter';
import { 
  Bell, 
  AlertTriangle, 
  UserCheck, 
  AtSign, 
  Phone, 
  MessageSquare, 
  Ticket, 
  Settings 
} from 'lucide-react';
import type { NotificationCategory } from '@/hooks/useNotificationFilters';

interface NotificationFiltersProps {
  selectedCategory: NotificationCategory;
  onSelectCategory: (category: NotificationCategory) => void;
  categoryCounts: Record<NotificationCategory, number>;
  unreadCounts: Record<NotificationCategory, number>;
}

const categoryConfig: Array<{
  id: NotificationCategory;
  label: string;
  icon: React.ElementType;
  variant?: 'default' | 'unread' | 'warning';
}> = [
  { id: 'all', label: 'All Notifications', icon: Bell },
  { id: 'urgent', label: 'Urgent', icon: AlertTriangle, variant: 'warning' },
  { id: 'assigned', label: 'Assigned to Me', icon: UserCheck },
  { id: 'mentions', label: 'Mentions & Tags', icon: AtSign },
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'system', label: 'System', icon: Settings },
];

export const NotificationFilters: React.FC<NotificationFiltersProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  unreadCounts,
}) => {
  return (
    <div className="w-64 border-r border-border bg-sidebar p-4 flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">
        Categories
      </h3>
      
      {categoryConfig.map(({ id, label, icon: Icon, variant }) => {
        const isActive = selectedCategory === id;
        const count = categoryCounts[id];
        const unreadCount = unreadCounts[id];
        
        // Skip categories with no notifications (except 'all')
        if (id !== 'all' && count === 0) return null;
        
        return (
          <button
            key={id}
            onClick={() => onSelectCategory(id)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors w-full text-left",
              isActive 
                ? "bg-primary/10 text-primary font-medium" 
                : "text-foreground hover:bg-muted/50",
              id === 'urgent' && unreadCount > 0 && "text-destructive"
            )}
          >
            <Icon className={cn(
              "h-4 w-4 shrink-0",
              id === 'urgent' && unreadCount > 0 && "text-destructive"
            )} />
            <span className="flex-1 truncate">{label}</span>
            {unreadCount > 0 && (
              <SidebarCounter 
                count={unreadCount} 
                variant={id === 'urgent' ? 'warning' : 'unread'} 
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
