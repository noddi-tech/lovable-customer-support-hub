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
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NewConversationDialog } from './NewConversationDialog';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InboxSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  selectedInboxId?: string;
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


export const InboxSidebar: React.FC<InboxSidebarProps> = ({ selectedTab, onTabChange, selectedInboxId }) => {
  const [expandedChannels, setExpandedChannels] = useState(true);
  const [expandedInboxes, setExpandedInboxes] = useState(true);
  const { t } = useTranslation();

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

  // Fetch unread notifications count
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('is_read', false);
      
      if (error) {
        console.error('Error fetching notification count:', error);
        return 0;
      }
      
      return data?.length || 0;
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
    <div className="pane flex flex-col bg-card/90 backdrop-blur-sm shadow-surface">
      {/* Create Button */}
      <div className="flex-shrink-0 p-4">
        <NewConversationDialog>
          <Button className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow">
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.sidebar.newConversation')}
          </Button>
        </NewConversationDialog>
      </div>

      {/* Inbox Categories - Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto -webkit-overflow-scrolling-touch">
        <div className="px-2">
          <div className="flex items-center justify-between px-2 py-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.sidebar.inbox')}</h3>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Filter className="h-3 w-3" />
            </Button>
          </div>
          
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start px-2 py-2 h-auto font-normal",
                    isSelected ? "bg-inbox-selected text-inbox-unread" : "text-foreground hover:bg-inbox-hover"
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count > 0 && (
                    <Badge 
                      variant={isSelected ? "default" : "secondary"} 
                      className="ml-auto h-5 text-xs"
                    >
                      {item.count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Notifications */}
        <div className="px-2">
          <div className="flex items-center justify-between px-2 py-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.sidebar.notifications')}</h3>
          </div>
          
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start px-2 py-2 h-auto font-normal",
                selectedTab === 'notifications' ? "bg-inbox-selected text-inbox-unread" : "text-foreground hover:bg-inbox-hover"
              )}
              onClick={() => {
                console.log('Notifications tab clicked, current selectedTab:', selectedTab);
                onTabChange('notifications');
                console.log('onTabChange called with notifications');
              }}
            >
              <Bell className="mr-3 h-4 w-4" />
              <span className="flex-1 text-left">{t('dashboard.sidebar.notifications')}</span>
              {unreadNotifications > 0 && (
                <Badge 
                  variant={selectedTab === 'notifications' ? "default" : "secondary"} 
                  className="ml-auto h-5 text-xs"
                >
                  {unreadNotifications}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Channels */}
        <div className="px-2">
          <div className="flex items-center justify-between px-2 py-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.sidebar.channels')}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setExpandedChannels(!expandedChannels)}
            >
              <Filter className="h-3 w-3" />
            </Button>
          </div>
          
          {expandedChannels && (
            <div className="space-y-1">
              {channelItems.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedTab === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start px-2 py-2 h-auto font-normal",
                      isSelected ? "bg-inbox-selected text-inbox-unread" : "text-foreground hover:bg-inbox-hover"
                    )}
                    onClick={() => onTabChange(item.id)}
                  >
                    <Icon 
                      className={cn(
                        "mr-3 h-4 w-4",
                        `text-${item.color}`
                      )} 
                    />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.count > 0 && (
                      <Badge 
                        variant={isSelected ? "default" : "secondary"} 
                        className="ml-auto h-5 text-xs"
                      >
                        {item.count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Inboxes */}
        <div className="px-2">
          <div className="flex items-center justify-between px-2 py-2">
            <h3 className="text-sm font-medium text-muted-foreground">{t('dashboard.sidebar.inboxes')}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0"
              onClick={() => setExpandedInboxes(!expandedInboxes)}
            >
              <Filter className="h-3 w-3" />
            </Button>
          </div>
          
          {expandedInboxes && (
            <div className="space-y-1">
              {inboxes.filter(inbox => inbox.is_active).map((inbox) => {
                const isSelected = selectedTab === `inbox-${inbox.id}`;
                
                return (
                  <Button
                    key={inbox.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start px-2 py-2 h-auto font-normal",
                      isSelected ? "bg-inbox-selected text-inbox-unread" : "text-foreground hover:bg-inbox-hover"
                    )}
                    onClick={() => onTabChange(`inbox-${inbox.id}`)}
                  >
                    <div 
                      className="mr-3 w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: inbox.color }}
                    />
                    <span className="flex-1 text-left truncate">{inbox.name}</span>
                    {inbox.conversation_count > 0 && (
                      <Badge 
                        variant={isSelected ? "default" : "secondary"} 
                        className="ml-auto h-5 text-xs"
                      >
                        {inbox.conversation_count}
                      </Badge>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};