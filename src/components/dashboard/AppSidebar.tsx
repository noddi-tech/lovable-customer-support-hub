import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { NewConversationDialog } from './NewConversationDialog';
import {
  Inbox,
  Users,
  Clock,
  CheckCircle,
  Archive,
  MessageCircle,
  MessageSquare,
  Mail,
  Facebook,
  Instagram,
  MessageCircle as WhatsApp,
  Bell,
  ChevronDown,
  ChevronRight,
  Plus,
  Filter
} from 'lucide-react';

interface InboxData {
  id: string;
  name: string;
  color: string;
  conversation_count: number;
}

interface AppSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  selectedTab,
  onTabChange
}) => {
  const { t } = useTranslation();
  const [expandedChannels, setExpandedChannels] = useState(true);
  const [expandedInboxes, setExpandedInboxes] = useState(true);

  // Fetch inboxes
  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data as InboxData[];
    }
  });

  // Fetch conversation counts
  const { data: conversationCounts = {} } = useQuery({
    queryKey: ['conversation-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) {
        console.error('Error fetching conversation counts:', error);
        return {} as Record<string, number>;
      }

      const conversations = (data || []) as any[];
      
      return {
        all: conversations.length,
        unread: conversations.filter((conv: any) => !conv.is_read).length,
        pending: conversations.filter((conv: any) => conv.status === 'pending').length,
        assigned: conversations.filter((conv: any) => conv.assigned_to?.id).length,
        closed: conversations.filter((conv: any) => conv.status === 'closed').length,
        archived: conversations.filter((conv: any) => conv.is_archived).length,
        email: conversations.filter((conv: any) => conv.channel === 'email').length,
        facebook: conversations.filter((conv: any) => conv.channel === 'facebook').length,
        instagram: conversations.filter((conv: any) => conv.channel === 'instagram').length,
        whatsapp: conversations.filter((conv: any) => conv.channel === 'whatsapp').length,
      } as Record<string, number>;
    },
    refetchInterval: 30000,
  });

  // Fetch unread notification counts
  const { data: notificationCounts = 0 } = useQuery({
    queryKey: ['notification-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('is_read', false);
      
      if (error) throw error;
      return data?.length || 0;
    },
    refetchInterval: 30000,
  });

  // Sidebar items configuration
  const sidebarItems = [
    { id: 'all', label: t('sidebar.allConversations', 'All'), icon: Inbox, count: conversationCounts?.all || 0 },
    { id: 'unread', label: t('sidebar.unread', 'Unread'), icon: MessageCircle, count: conversationCounts?.unread || 0 },
    { id: 'assigned', label: t('sidebar.assigned', 'Assigned'), icon: Users, count: conversationCounts?.assigned || 0 },
    { id: 'pending', label: t('sidebar.pending', 'Pending'), icon: Clock, count: conversationCounts?.pending || 0 },
    { id: 'closed', label: t('sidebar.closed', 'Closed'), icon: CheckCircle, count: conversationCounts?.closed || 0 },
    { id: 'archived', label: t('sidebar.archived', 'Archived'), icon: Archive, count: conversationCounts?.archived || 0 },
  ];

  const channelItems = [
    { id: 'email', label: t('sidebar.email', 'Email'), icon: Mail, count: conversationCounts?.email || 0 },
    { id: 'facebook', label: t('sidebar.facebook', 'Facebook'), icon: Facebook, count: conversationCounts?.facebook || 0 },
    { id: 'instagram', label: t('sidebar.instagram', 'Instagram'), icon: Instagram, count: conversationCounts?.instagram || 0 },
    { id: 'whatsapp', label: t('sidebar.whatsapp', 'WhatsApp'), icon: WhatsApp, count: conversationCounts?.whatsapp || 0 },
  ];

  return (
    <Sidebar 
      className="border-r border-border bg-sidebar-background text-sidebar-foreground"
      collapsible="none"
    >
      <SidebarContent className="p-0">
        {/* New Conversation Button */}
        <SidebarGroup className="px-3 py-4">
          <NewConversationDialog>
            <Button className="w-full gap-2" size="sm">
              <Plus className="h-4 w-4" />
              {t('sidebar.newConversation', 'New Conversation')}
            </Button>
          </NewConversationDialog>
        </SidebarGroup>

        <Separator />
        {/* Inbox Categories */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            {t('sidebar.inbox', 'Inbox')}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Filter className="h-3 w-3" />
            </Button>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedTab === item.id;
                
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => onTabChange(item.id)}
                      className={cn(
                        "w-full justify-start",
                        isSelected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                      {item.count > 0 && (
                        <Badge 
                          variant={isSelected ? "default" : "secondary"} 
                          className="ml-auto h-5 text-xs"
                        >
                          {item.count}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Notifications */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {t('sidebar.notifications', 'Notifications')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onTabChange('notifications')}
                  className={cn(
                    "w-full justify-start",
                    selectedTab === 'notifications' ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                  )}
                >
                  <Bell className="h-4 w-4" />
                  <span>{t('sidebar.notifications', 'Notifications')}</span>
                  {notificationCounts > 0 && (
                    <Badge 
                      variant={selectedTab === 'notifications' ? "default" : "secondary"} 
                      className="ml-auto h-5 text-xs"
                    >
                      {notificationCounts}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator />

        {/* Channels */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>{t('sidebar.channels', 'Channels')}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setExpandedChannels(!expandedChannels)}
            >
              {expandedChannels ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </SidebarGroupLabel>
          {expandedChannels && (
            <SidebarGroupContent>
              <SidebarMenu>
                {channelItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = selectedTab === item.id;
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          "w-full justify-start",
                          isSelected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.count > 0 && (
                          <Badge 
                            variant={isSelected ? "default" : "secondary"} 
                            className="ml-auto h-5 text-xs"
                          >
                            {item.count}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <Separator />

        {/* Inboxes */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>{t('sidebar.inboxes', 'Inboxes')}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setExpandedInboxes(!expandedInboxes)}
            >
              {expandedInboxes ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </SidebarGroupLabel>
          {expandedInboxes && (
            <SidebarGroupContent>
              <SidebarMenu>
                {inboxes.filter(inbox => inbox.is_active).map((inbox) => {
                  const inboxTabId = `inbox-${inbox.id}`;
                  const isSelected = selectedTab === inboxTabId;
                  
                  return (
                    <SidebarMenuItem key={inbox.id}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(inboxTabId)}
                        className={cn(
                          "w-full justify-start",
                          isSelected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                        )}
                      >
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: inbox.color }}
                        />
                        <span className="truncate">{inbox.name}</span>
                        {inbox.conversation_count > 0 && (
                          <Badge 
                            variant={isSelected ? "default" : "secondary"} 
                            className="ml-auto h-5 text-xs"
                          >
                            {inbox.conversation_count}
                          </Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};