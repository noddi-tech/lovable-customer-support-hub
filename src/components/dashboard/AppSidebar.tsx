import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Inbox, 
  Archive, 
  Clock, 
  Users, 
  Mail, 
  MessageCircle, 
  Camera,
  Phone,
  Filter,
  Plus,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewConversationDialog } from './NewConversationDialog';
import { useTranslation } from 'react-i18next';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  selectedInboxId?: string;
  context?: 'text' | 'voice' | 'all';
}

interface InboxData {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_default: boolean;
  is_active: boolean;
  conversation_count: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ 
  selectedTab, 
  onTabChange, 
  selectedInboxId, 
  context = 'all' 
}) => {
  const [expandedChannels, setExpandedChannels] = useState(true);
  const [expandedInboxes, setExpandedInboxes] = useState(true);
  const { t } = useTranslation();
  const { state } = useSidebar();

  const isCollapsed = state === 'collapsed';
  
  const effectiveInboxId = selectedTab.startsWith('inbox-')
    ? selectedTab.replace('inbox-', '')
    : (selectedInboxId && selectedInboxId !== 'all' ? selectedInboxId : null);

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
  const { data: conversationCounts = {}, isLoading } = useQuery({
    queryKey: ['conversation-counts', effectiveInboxId, selectedTab],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) {
        console.error('Error fetching conversation counts:', error);
        return {} as Record<string, number>;
      }

      const conversations = (data || []) as any[];
      const filtered = effectiveInboxId
        ? conversations.filter((conv: any) => conv.inbox_id === effectiveInboxId)
        : conversations;
      
      return {
        all: filtered.length,
        inbox: filtered.filter((conv: any) => conv.status !== 'closed').length,
        closed: filtered.filter((conv: any) => conv.status === 'closed').length,
        unread: filtered.filter((conv: any) => !conv.is_read).length,
        pending: filtered.filter((conv: any) => conv.status === 'pending').length,
        assigned: filtered.filter((conv: any) => conv.assigned_to?.id).length,
        archived: filtered.filter((conv: any) => conv.is_archived).length,
        snoozed: 0, // Not implemented yet
        email: filtered.filter((conv: any) => conv.channel === 'email').length,
        facebook: filtered.filter((conv: any) => conv.channel === 'facebook').length,
        instagram: filtered.filter((conv: any) => conv.channel === 'instagram').length,
        whatsapp: filtered.filter((conv: any) => conv.channel === 'whatsapp').length,
      } as Record<string, number>;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch context-aware notifications count for current user
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['unread-notifications', context],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false);
      
      if (error) {
        console.error('Error fetching notification count:', error);
        return 0;
      }
      
      // Filter notifications based on context
      const filteredNotifications = data?.filter(notification => {
        if (context === 'all') return true;
        
        const notificationData = typeof notification.data === 'object' && notification.data !== null ? notification.data as any : {};
        const hasCallId = notificationData.call_id;
        const isVoiceRelated = hasCallId || 
          notification.title?.includes('📞') || 
          notification.title?.includes('🎙️') ||
          notification.title?.toLowerCase().includes('call') ||
          notification.title?.toLowerCase().includes('voicemail') ||
          notification.title?.toLowerCase().includes('callback');
        
        if (context === 'voice') return isVoiceRelated;
        if (context === 'text') return !isVoiceRelated;
        
        return true;
      }) || [];
      
      return filteredNotifications.length;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const sidebarItems = [
    { id: 'unread', label: t('dashboard.sidebar.unread'), icon: Inbox, count: conversationCounts.unread || 0 },
    { id: 'pending', label: t('dashboard.sidebar.pending'), icon: Clock, count: conversationCounts.pending || 0 },
    { id: 'closed', label: t('dashboard.sidebar.closed'), icon: CheckCircle, count: conversationCounts.closed || 0 },
    { id: 'assigned', label: t('dashboard.sidebar.assignedToMe'), icon: Users, count: conversationCounts.assigned || 0 },
    { id: 'all', label: t('dashboard.sidebar.inbox'), icon: Inbox, count: conversationCounts.inbox || 0 },
    { id: 'archived', label: t('dashboard.sidebar.archived'), icon: Archive, count: conversationCounts.archived || 0 },
    { id: 'snoozed', label: t('dashboard.sidebar.snoozed'), icon: Clock, count: conversationCounts.snoozed || 0 },
  ];

  const channelItems = [
    { id: 'email', label: t('dashboard.sidebar.email'), icon: Mail, count: conversationCounts.email || 0, color: 'channel-email' },
    { id: 'facebook', label: t('dashboard.sidebar.facebook'), icon: MessageCircle, count: conversationCounts.facebook || 0, color: 'channel-facebook' },
    { id: 'instagram', label: t('dashboard.sidebar.instagram'), icon: Camera, count: conversationCounts.instagram || 0, color: 'channel-instagram' },
    { id: 'whatsapp', label: t('dashboard.sidebar.whatsapp'), icon: Phone, count: conversationCounts.whatsapp || 0, color: 'channel-whatsapp' },
  ];

  return (
    <Sidebar 
      className={cn(
        "border-r border-border bg-card/90 backdrop-blur-sm shadow-surface",
        isCollapsed ? "w-16" : "w-60"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="p-4">
        {!isCollapsed && (
          <NewConversationDialog>
            <Button className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow">
              <Plus className="mr-2 h-4 w-4" />
              {t('dashboard.sidebar.newConversation')}
            </Button>
          </NewConversationDialog>
        )}
        {isCollapsed && (
          <NewConversationDialog>
            <Button size="icon" className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4" />
            </Button>
          </NewConversationDialog>
        )}
      </SidebarHeader>

      <SidebarContent>
        {/* Inbox Categories */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            {!isCollapsed && t('dashboard.sidebar.inbox')}
            {!isCollapsed && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Filter className="h-3 w-3" />
              </Button>
            )}
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
                        isSelected ? "bg-inbox-selected text-inbox-unread" : "hover:bg-inbox-hover"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.label}</span>}
                      {!isCollapsed && item.count > 0 && (
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

        <Separator className="my-2" />

        {/* Notifications */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!isCollapsed && t('dashboard.sidebar.notifications')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    console.log('Notifications tab clicked, current selectedTab:', selectedTab);
                    onTabChange('notifications');
                    console.log('onTabChange called with notifications');
                  }}
                  className={cn(
                    "w-full justify-start",
                    selectedTab === 'notifications' ? "bg-inbox-selected text-inbox-unread" : "hover:bg-inbox-hover"
                  )}
                >
                  <Bell className="h-4 w-4" />
                  {!isCollapsed && <span>{t('dashboard.sidebar.notifications')}</span>}
                  {!isCollapsed && unreadNotifications > 0 && (
                    <Badge 
                      variant={selectedTab === 'notifications' ? "default" : "secondary"} 
                      className="ml-auto h-5 text-xs"
                    >
                      {unreadNotifications}
                    </Badge>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        {/* Channels */}
        {expandedChannels && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              {!isCollapsed && (
                <>
                  <span>{t('dashboard.sidebar.channels')}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setExpandedChannels(!expandedChannels)}
                  >
                    {expandedChannels ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </Button>
                </>
              )}
            </SidebarGroupLabel>
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
                          isSelected ? "bg-inbox-selected text-inbox-unread" : "hover:bg-inbox-hover"
                        )}
                      >
                        <Icon 
                          className={cn(
                            "h-4 w-4",
                            `text-${item.color}`
                          )} 
                        />
                        {!isCollapsed && <span>{item.label}</span>}
                        {!isCollapsed && item.count > 0 && (
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
        )}

        <Separator className="my-2" />

        {/* Inboxes */}
        {expandedInboxes && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center justify-between">
              {!isCollapsed && (
                <>
                  <span>{t('dashboard.sidebar.inboxes')}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0"
                    onClick={() => setExpandedInboxes(!expandedInboxes)}
                  >
                    {expandedInboxes ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </Button>
                </>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {inboxes.filter(inbox => inbox.is_active).map((inbox) => {
                  const isSelected = selectedTab === `inbox-${inbox.id}`;
                  
                  return (
                    <SidebarMenuItem key={inbox.id}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(`inbox-${inbox.id}`)}
                        className={cn(
                          "w-full justify-start",
                          isSelected ? "bg-inbox-selected text-inbox-unread" : "hover:bg-inbox-hover"
                        )}
                      >
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: inbox.color }}
                        />
                        {!isCollapsed && <span className="truncate">{inbox.name}</span>}
                        {!isCollapsed && inbox.conversation_count > 0 && (
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
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};