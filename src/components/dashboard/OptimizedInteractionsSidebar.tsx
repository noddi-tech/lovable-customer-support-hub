import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Inbox, MessageCircle, Users, Clock, CheckCircle, Archive, Bell, Mail, Facebook, Instagram, MessageCircle as WhatsApp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { SidebarSection } from '@/components/ui/sidebar-section';
import { SidebarItem } from '@/components/ui/sidebar-item';
import { NewConversationDialog } from './NewConversationDialog';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';

interface OptimizedInteractionsSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  selectedInboxId?: string;
}

export const OptimizedInteractionsSidebar: React.FC<OptimizedInteractionsSidebarProps> = ({
  selectedTab,
  onTabChange,
  selectedInboxId
}) => {
  const { t } = useTranslation();
  const { conversations, channels, notifications, inboxes, loading, error, prefetchData } = useOptimizedCounts();

  // Sidebar items configuration with optimized counts
  const inboxItems = [
    { 
      id: 'all', 
      label: t('sidebar.allConversations', 'All'), 
      icon: Inbox, 
      count: conversations.all 
    },
    { 
      id: 'unread', 
      label: t('sidebar.unread', 'Unread'), 
      icon: MessageCircle, 
      count: conversations.unread 
    },
    { 
      id: 'assigned', 
      label: t('sidebar.assigned', 'Assigned'), 
      icon: Users, 
      count: conversations.assigned 
    },
    { 
      id: 'pending', 
      label: t('sidebar.pending', 'Pending'), 
      icon: Clock, 
      count: conversations.pending 
    },
    { 
      id: 'closed', 
      label: t('sidebar.closed', 'Closed'), 
      icon: CheckCircle, 
      count: conversations.closed 
    },
    { 
      id: 'archived', 
      label: t('sidebar.archived', 'Archived'), 
      icon: Archive, 
      count: conversations.archived 
    },
  ];

  const channelItems = [
    { 
      id: 'email', 
      label: t('sidebar.email', 'Email'), 
      icon: Mail, 
      count: channels.email 
    },
    { 
      id: 'facebook', 
      label: t('sidebar.facebook', 'Facebook'), 
      icon: Facebook, 
      count: channels.facebook 
    },
    { 
      id: 'instagram', 
      label: t('sidebar.instagram', 'Instagram'), 
      icon: Instagram, 
      count: channels.instagram 
    },
    { 
      id: 'whatsapp', 
      label: t('sidebar.whatsapp', 'WhatsApp'), 
      icon: WhatsApp, 
      count: channels.whatsapp 
    },
  ];

  const activeInboxes = inboxes.filter(inbox => inbox.is_active);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-2 px-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-6" />
        </div>
      ))}
    </div>
  );

  // Error state
  if (error) {
    return (
      <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <SidebarContent className="p-4">
          <div className="text-center">
            <p className="text-sm text-destructive">Error loading sidebar data</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar 
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
      collapsible="none"
    >
      <SidebarContent className="p-0">
        {/* New Conversation Button */}
        <div className="p-3 pt-4">
          <NewConversationDialog>
            <Button className="w-full gap-2" size="sm">
              <Plus className="h-4 w-4" />
              {t('sidebar.newConversation', 'New Conversation')}
            </Button>
          </NewConversationDialog>
        </div>

        <Separator />

        {/* Inbox Categories */}
        <SidebarSection
          title={t('sidebar.inbox', 'Inbox')}
          showFilter={true}
          onFilterClick={() => console.log('Filter inbox items')}
        >
          {loading ? (
            <LoadingSkeleton />
          ) : (
            inboxItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                count={item.count}
                active={selectedTab === item.id}
                onClick={() => onTabChange(item.id)}
                onMouseEnter={() => prefetchData('conversations')}
              />
            ))
          )}
        </SidebarSection>

        <Separator />

        {/* Notifications */}
        <SidebarSection
          title={t('sidebar.notifications', 'Notifications')}
          collapsible={false}
        >
          {loading ? (
            <LoadingSkeleton />
          ) : (
            <SidebarItem
              icon={Bell}
              label={t('sidebar.notifications', 'Notifications')}
              count={notifications}
              active={selectedTab === 'notifications'}
              onClick={() => onTabChange('notifications')}
              onMouseEnter={() => prefetchData('notifications')}
            />
          )}
        </SidebarSection>

        <Separator />

        {/* Channels */}
        <SidebarSection
          title={t('sidebar.channels', 'Channels')}
          defaultExpanded={true}
        >
          {loading ? (
            <LoadingSkeleton />
          ) : (
            channelItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                count={item.count}
                active={selectedTab === item.id}
                onClick={() => onTabChange(item.id)}
                variant="channel"
                onMouseEnter={() => prefetchData('conversations')}
              />
            ))
          )}
        </SidebarSection>

        <Separator />

        {/* Inboxes */}
        <SidebarSection
          title={t('sidebar.inboxes', 'Inboxes')}
          defaultExpanded={true}
        >
          {loading ? (
            <LoadingSkeleton />
          ) : (
            activeInboxes.map((inbox) => {
              const inboxTabId = `inbox-${inbox.id}`;
              return (
                <SidebarItem
                  key={inbox.id}
                  icon={Users}
                  label={inbox.name}
                  count={inbox.conversation_count}
                  active={selectedTab === inboxTabId}
                  onClick={() => onTabChange(inboxTabId)}
                  variant="inbox"
                  color={inbox.color}
                />
              );
            })
          )}
        </SidebarSection>
      </SidebarContent>
    </Sidebar>
  );
};