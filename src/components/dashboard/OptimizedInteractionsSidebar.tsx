import React, { memo, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Inbox, MessageCircle, Users, Clock, CheckCircle, Archive, Bell, Mail, Facebook, Instagram, MessageCircle as WhatsApp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { SidebarSection } from '@/components/ui/sidebar-section';
import { SidebarItem } from '@/components/ui/sidebar-item';
import { EnhancedLoadingSkeleton } from '@/components/ui/enhanced-loading-skeleton';
import { NewConversationDialog } from './NewConversationDialog';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';

interface OptimizedInteractionsSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  selectedInboxId?: string;
}

export const OptimizedInteractionsSidebar = memo<OptimizedInteractionsSidebarProps>(({
  selectedTab,
  onTabChange,
  selectedInboxId
}) => {
  const { t } = useTranslation();
  const { 
    conversations, 
    channels, 
    notifications, 
    inboxes, 
    loading, 
    error, 
    prefetchData,
    isInboxSpecific
  } = useOptimizedCounts(selectedInboxId);
  const { navigateToTab } = useInteractionsNavigation();

  // Memoize the tab change handler to prevent unnecessary re-renders
  const handleTabChange = useCallback((tab: string) => {
    navigateToTab(tab);
    onTabChange(tab);
  }, [navigateToTab, onTabChange]);

  // Memoize sidebar configurations to prevent recreation on every render
  const sidebarConfig = useMemo(() => ({
    inboxItems: [
      { 
        id: 'open', 
        label: t('sidebar.open', 'Open'), 
        icon: Mail, 
        count: conversations.open 
      },
      { 
        id: 'pending', 
        label: t('common.sidebar.pending', 'Pending'), 
        icon: Clock, 
        count: conversations.pending 
      },
      { 
        id: 'assigned', 
        label: t('sidebar.assignedToMe', 'Assigned to Me'), 
        icon: Users, 
        count: conversations.assigned 
      },
      { 
        id: 'closed', 
        label: t('common.sidebar.closed', 'Closed'), 
        icon: CheckCircle, 
        count: conversations.closed 
      },
      { 
        id: 'archived', 
        label: t('common.sidebar.archived', 'Archived'), 
        icon: Archive, 
        count: conversations.archived 
      },
      { 
        id: 'all', 
        label: t('sidebar.allMessages', 'All Messages'), 
        icon: Inbox, 
        count: conversations.all 
      },
    ],
    channelItems: [
      { 
        id: 'email', 
        label: t('common.sidebar.email', 'Email'), 
        icon: Mail, 
        count: channels.email 
      },
      { 
        id: 'facebook', 
        label: t('common.sidebar.facebook', 'Facebook'), 
        icon: Facebook, 
        count: channels.facebook 
      },
      { 
        id: 'instagram', 
        label: t('common.sidebar.instagram', 'Instagram'), 
        icon: Instagram, 
        count: channels.instagram 
      },
      { 
        id: 'whatsapp', 
        label: t('sidebar.whatsapp', 'WhatsApp'), 
        icon: WhatsApp, 
        count: channels.whatsapp 
      },
    ],
    activeInboxes: inboxes.filter(inbox => inbox.is_active)
  }), [
    t,
    conversations.open,
    conversations.pending,
    conversations.assigned,
    conversations.closed,
    conversations.archived,
    conversations.all,
    channels.email,
    channels.facebook,
    channels.instagram,
    channels.whatsapp,
    inboxes
  ]);

  // Memoize prefetch handlers
  const prefetchHandlers = useMemo(() => ({
    conversations: () => prefetchData('conversations'),
    notifications: () => prefetchData('notifications')
  }), [prefetchData]);

  // Loading skeleton
  const LoadingSkeleton = () => (
    <EnhancedLoadingSkeleton type="sidebar" count={6} />
  );

  // Error state - Don't show error UI, just log it
  if (error) {
    console.error('Sidebar data error:', error);
  }

  return (
    <Sidebar 
      className="border-r border-sidebar-border text-sidebar-foreground [&>[data-sidebar=sidebar]]:bg-background"
      collapsible="none"
    >
      <SidebarContent className="p-0">
        {/* New Conversation Button */}
        <div className="p-1">
          <NewConversationDialog>
            <Button className="w-full gap-1 h-6 text-xs" size="sm">
              <Plus className="h-2.5 w-2.5" />
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
            sidebarConfig.inboxItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                count={item.count}
                active={selectedTab === item.id}
                onClick={() => handleTabChange(item.id)}
                onMouseEnter={prefetchHandlers.conversations}
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
              onClick={() => handleTabChange('notifications')}
              onMouseEnter={prefetchHandlers.notifications}
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
            sidebarConfig.channelItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                count={item.count}
                active={selectedTab === item.id}
                onClick={() => handleTabChange(item.id)}
                variant="channel"
                onMouseEnter={prefetchHandlers.conversations}
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
            sidebarConfig.activeInboxes.map((inbox) => {
              const inboxTabId = `inbox-${inbox.id}`;
              return (
                <SidebarItem
                  key={inbox.id}
                  icon={Users}
                  label={inbox.name}
                  count={inbox.conversation_count}
                  active={selectedTab === inboxTabId}
                  onClick={() => handleTabChange(inboxTabId)}
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
});