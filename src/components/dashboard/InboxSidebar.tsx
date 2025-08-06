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
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface InboxSidebarProps {
  selectedTab: string;
  onTabChange: (tab: string) => void;
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


export const InboxSidebar: React.FC<InboxSidebarProps> = ({ selectedTab, onTabChange }) => {
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
  const { data: conversationCounts = {}, isLoading } = useQuery({
    queryKey: ['conversation-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversations');
      if (error) {
        console.error('Error fetching conversation counts:', error);
        return {};
      }

      const conversations = data || [];
      
      return {
        all: conversations.length,
        unread: conversations.filter((conv: any) => !conv.is_read).length,
        assigned: conversations.filter((conv: any) => conv.assigned_to?.id).length,
        archived: conversations.filter((conv: any) => conv.is_archived).length,
        snoozed: 0, // Not implemented yet
        email: conversations.filter((conv: any) => conv.channel === 'email').length,
        facebook: conversations.filter((conv: any) => conv.channel === 'facebook').length,
        instagram: conversations.filter((conv: any) => conv.channel === 'instagram').length,
        whatsapp: conversations.filter((conv: any) => conv.channel === 'whatsapp').length,
      };
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
    { id: 'all', label: 'All Conversations', icon: Inbox, count: conversationCounts.all || 0 },
    { id: 'unread', label: 'Unread', icon: Inbox, count: conversationCounts.unread || 0 },
    { id: 'assigned', label: 'Assigned to me', icon: Users, count: conversationCounts.assigned || 0 },
    { id: 'archived', label: 'Archived', icon: Archive, count: conversationCounts.archived || 0 },
    { id: 'snoozed', label: 'Snoozed', icon: Clock, count: conversationCounts.snoozed || 0 },
  ];

  const channelItems = [
    { id: 'email', label: 'Email', icon: Mail, count: conversationCounts.email || 0, color: 'channel-email' },
    { id: 'facebook', label: 'Facebook', icon: MessageCircle, count: conversationCounts.facebook || 0, color: 'channel-facebook' },
    { id: 'instagram', label: 'Instagram', icon: Camera, count: conversationCounts.instagram || 0, color: 'channel-instagram' },
    { id: 'whatsapp', label: 'WhatsApp', icon: Phone, count: conversationCounts.whatsapp || 0, color: 'channel-whatsapp' },
  ];

  return (
    <div className="w-64 bg-card/90 backdrop-blur-sm border-r border-border h-full flex flex-col shadow-surface">
      {/* Create Button */}
      <div className="p-4">
        <Button className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      {/* Inbox Categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-2">
          <div className="flex items-center justify-between px-2 py-2">
            <h3 className="text-sm font-medium text-muted-foreground">INBOX</h3>
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
            <h3 className="text-sm font-medium text-muted-foreground">NOTIFICATIONS</h3>
          </div>
          
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start px-2 py-2 h-auto font-normal",
                selectedTab === 'notifications' ? "bg-inbox-selected text-inbox-unread" : "text-foreground hover:bg-inbox-hover"
              )}
              onClick={() => onTabChange('notifications')}
            >
              <Bell className="mr-3 h-4 w-4" />
              <span className="flex-1 text-left">Notifications</span>
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
            <h3 className="text-sm font-medium text-muted-foreground">CHANNELS</h3>
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
            <h3 className="text-sm font-medium text-muted-foreground">INBOXES</h3>
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