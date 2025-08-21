import React from 'react';
import { 
  Inbox, 
  MessageCircle, 
  Users, 
  Clock, 
  CheckCircle, 
  Archive, 
  Bell, 
  Mail, 
  Facebook, 
  Instagram,
  MessageCircle as WhatsApp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarCounter } from '@/components/ui/sidebar-counter';
import { cn } from '@/lib/utils';
import { useConversationCounts } from '@/hooks/useConversationCounts';
import { useChannelCounts } from '@/hooks/useChannelCounts';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { useTranslation } from 'react-i18next';

interface TabletSidebarCollapsedProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export const TabletSidebarCollapsed: React.FC<TabletSidebarCollapsedProps> = ({
  selectedTab,
  onTabChange
}) => {
  const { t } = useTranslation();
  const { data: conversationCounts } = useConversationCounts();
  const { data: channelCounts } = useChannelCounts();
  const { data: notificationCount } = useNotificationCounts();

  const iconItems = [
    // Inbox items
    { id: 'all', icon: Inbox, label: t('sidebar.allConversations', 'All'), count: conversationCounts?.all },
    { id: 'unread', icon: MessageCircle, label: t('sidebar.unread', 'Unread'), count: conversationCounts?.unread },
    { id: 'assigned', icon: Users, label: t('sidebar.assigned', 'Assigned'), count: conversationCounts?.assigned },
    { id: 'pending', icon: Clock, label: t('sidebar.pending', 'Pending'), count: conversationCounts?.pending },
    { id: 'closed', icon: CheckCircle, label: t('sidebar.closed', 'Closed'), count: conversationCounts?.closed },
    { id: 'archived', icon: Archive, label: t('sidebar.archived', 'Archived'), count: conversationCounts?.archived },
    
    // Notifications
    { id: 'notifications', icon: Bell, label: t('sidebar.notifications', 'Notifications'), count: notificationCount },
    
    // Channels
    { id: 'email', icon: Mail, label: t('sidebar.email', 'Email'), count: channelCounts?.email },
    { id: 'facebook', icon: Facebook, label: t('sidebar.facebook', 'Facebook'), count: channelCounts?.facebook },
    { id: 'instagram', icon: Instagram, label: t('sidebar.instagram', 'Instagram'), count: channelCounts?.instagram },
    { id: 'whatsapp', icon: WhatsApp, label: t('sidebar.whatsapp', 'WhatsApp'), count: channelCounts?.whatsapp },
  ];

  return (
    <TooltipProvider>
      <div className="flex flex-col w-16 h-full bg-sidebar border-r border-sidebar-border">
        <div className="flex flex-col gap-1 p-2">
          {iconItems.map((item) => {
            const Icon = item.icon;
            const isActive = selectedTab === item.id;
            
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "w-12 h-12 p-0 relative flex flex-col items-center justify-center",
                      "hover:bg-sidebar-accent/50",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.count && item.count > 0 && (
                      <div className="absolute -top-1 -right-1">
                        <SidebarCounter 
                          count={item.count} 
                          variant={isActive ? 'active' : 'default'}
                          className="scale-75"
                        />
                      </div>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>{item.label}</p>
                  {item.count && item.count > 0 && (
                    <p className="text-xs text-muted-foreground">{item.count} items</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};