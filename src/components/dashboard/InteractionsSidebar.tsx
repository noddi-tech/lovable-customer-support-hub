import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Inbox, MessageCircle, Users, Clock, CheckCircle, Archive, Bell, Mail, Facebook, Instagram, MessageCircle as WhatsApp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { SidebarSection } from '@/components/ui/sidebar-section';
import { SidebarItem } from '@/components/ui/sidebar-item';
import { NewConversationDialog } from './NewConversationDialog';
import { useConversationCounts } from '@/hooks/useConversationCounts';
import { useChannelCounts } from '@/hooks/useChannelCounts';
import { useInboxCounts } from '@/hooks/useInboxCounts';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

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

  // Fetch all counts using optimized hooks
  const { data: conversationCounts, isLoading: conversationLoading } = useConversationCounts();
  const { data: channelCounts, isLoading: channelLoading } = useChannelCounts();
  const { data: inboxData, isLoading: inboxLoading } = useInboxCounts();
  const { data: notificationCount, isLoading: notificationLoading } = useNotificationCounts();

  // Sidebar items configuration
  const inboxItems = [
    { 
      id: 'all', 
      label: t('sidebar.allConversations', 'All'), 
      icon: Inbox, 
      count: conversationCounts?.all || 0 
    },
    { 
      id: 'unread', 
      label: t('sidebar.unread', 'Unread'), 
      icon: MessageCircle, 
      count: conversationCounts?.unread || 0 
    },
    { 
      id: 'assigned', 
      label: t('sidebar.assigned', 'Assigned'), 
      icon: Users, 
      count: conversationCounts?.assigned || 0 
    },
    { 
      id: 'pending', 
      label: t('sidebar.pending', 'Pending'), 
      icon: Clock, 
      count: conversationCounts?.pending || 0 
    },
    { 
      id: 'closed', 
      label: t('sidebar.closed', 'Closed'), 
      icon: CheckCircle, 
      count: conversationCounts?.closed || 0 
    },
    { 
      id: 'archived', 
      label: t('sidebar.archived', 'Archived'), 
      icon: Archive, 
      count: conversationCounts?.archived || 0 
    },
  ];

  const channelItems = [
    { 
      id: 'email', 
      label: t('sidebar.email', 'Email'), 
      icon: Mail, 
      count: channelCounts?.email || 0 
    },
    { 
      id: 'facebook', 
      label: t('sidebar.facebook', 'Facebook'), 
      icon: Facebook, 
      count: channelCounts?.facebook || 0 
    },
    { 
      id: 'instagram', 
      label: t('sidebar.instagram', 'Instagram'), 
      icon: Instagram, 
      count: channelCounts?.instagram || 0 
    },
    { 
      id: 'whatsapp', 
      label: t('sidebar.whatsapp', 'WhatsApp'), 
      icon: WhatsApp, 
      count: channelCounts?.whatsapp || 0 
    },
  ];

  const activeInboxes = inboxData?.filter(inbox => inbox.is_active) || [];

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
          {inboxItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              count={item.count}
              active={selectedTab === item.id}
              onClick={() => onTabChange(item.id)}
              disabled={conversationLoading}
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
            count={notificationCount}
            active={selectedTab === 'notifications'}
            onClick={() => onTabChange('notifications')}
            disabled={notificationLoading}
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
              onClick={() => onTabChange(item.id)}
              variant="channel"
              disabled={channelLoading}
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
                onClick={() => onTabChange(inboxTabId)}
                variant="inbox"
                color={inbox.color}
                disabled={inboxLoading}
              />
            );
          })}
        </SidebarSection>
      </SidebarContent>
    </Sidebar>
  );
};