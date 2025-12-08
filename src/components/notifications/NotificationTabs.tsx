import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, Phone, MessageSquare, Mail, Ticket, UserCheck, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NotificationCategory } from '@/hooks/useNotificationFilters';

interface NotificationTabsProps {
  selectedCategory: NotificationCategory;
  onSelectCategory: (category: NotificationCategory) => void;
  unreadCounts: Record<NotificationCategory, number>;
}

const tabConfig: Array<{
  id: NotificationCategory;
  label: string;
  icon: React.ElementType;
}> = [
  { id: 'unread', label: 'Unread', icon: Bell },
  { id: 'mentions', label: 'Mentions', icon: AtSign },
  { id: 'calls', label: 'Calls', icon: Phone },
  { id: 'text', label: 'Text', icon: MessageSquare },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'tickets', label: 'Tickets', icon: Ticket },
  { id: 'assigned', label: 'Assigned', icon: UserCheck },
];

export const NotificationTabs: React.FC<NotificationTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  unreadCounts,
}) => {
  const navigate = useNavigate();

  const handleTabChange = (value: string) => {
    const category = value as NotificationCategory;
    // Navigate via URL for proper browser history
    navigate(`/notifications/${category}`, { replace: false });
    // Also call the callback for any side effects
    onSelectCategory(category);
  };

  return (
    <Tabs value={selectedCategory} onValueChange={handleTabChange}>
      <TabsList className="h-auto p-1 bg-muted/50">
        {tabConfig.map(({ id, label, icon: Icon }) => {
          const count = unreadCounts[id];
          return (
            <TabsTrigger
              key={id}
              value={id}
              className={cn(
                "flex items-center gap-2 px-4 py-2 data-[state=active]:bg-background",
                "data-[state=active]:shadow-sm"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <Badge 
                  variant={id === 'calls' ? 'destructive' : 'secondary'}
                  className="h-5 min-w-5 px-1.5 text-xs"
                >
                  {count > 99 ? '99+' : count}
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
};
