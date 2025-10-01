import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Inbox, MessageCircle, Users, Clock, CheckCircle, Archive, Bell, Mail, Facebook, Instagram, MessageCircle as WhatsApp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { SidebarSection } from '@/components/ui/sidebar-section';
import { SidebarItem } from '@/components/ui/sidebar-item';
import { NewConversationDialog } from './NewConversationDialog';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';

interface InteractionsSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  selectedInboxId?: string;
}

export const InteractionsSidebar: React.FC<InteractionsSidebarProps> = ({
  selectedTab,
  onTabChange,
  selectedInboxId
}) => {
  const { t } = useTranslation();
  const { conversations, channels, notifications, inboxes, loading, error, prefetchData } = useOptimizedCounts();
  const { navigateToTab } = useInteractionsNavigation();

  // Enhanced tab change with URL navigation
  const handleTabChange = (tab: string) => {
    navigateToTab(tab);
    onTabChange(tab);
  };

  // Sidebar items configuration
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

  // Error state - Don't show error UI, just log it
  if (error) {
    console.error('Sidebar data error:', error);
  }

  return (
    <Sidebar 
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
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
          {inboxItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              count={item.count}
              active={selectedTab === item.id}
              onClick={() => handleTabChange(item.id)}
              onMouseEnter={() => prefetchData('conversations')}
            />
          ))}
        </SidebarSection>

        <Separator />

        {/* Notifications */}
        <SidebarSection
          title={t('sidebar.notifications', 'Notifications')}
          collapsible={false}
        >
          <SidebarItem
            icon={Bell}
            label={t('sidebar.notifications', 'Notifications')}
            count={notifications}
            active={selectedTab === 'notifications'}
            onClick={() => handleTabChange('notifications')}
            onMouseEnter={() => prefetchData('notifications')}
          />
        </SidebarSection>

        <Separator />

        {/* Channels */}
        <SidebarSection
          title={t('sidebar.channels', 'Channels')}
          defaultExpanded={true}
        >
          {channelItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              count={item.count}
              active={selectedTab === item.id}
              onClick={() => handleTabChange(item.id)}
              variant="channel"
              onMouseEnter={() => prefetchData('conversations')}
            />
          ))}
        </SidebarSection>

        <Separator />

        {/* Inboxes */}
        <SidebarSection
          title={t('sidebar.inboxes', 'Inboxes')}
          defaultExpanded={true}
        >
          {activeInboxes.map((inbox) => {
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
          })}
        </SidebarSection>
      </SidebarContent>
    </Sidebar>
  );
};