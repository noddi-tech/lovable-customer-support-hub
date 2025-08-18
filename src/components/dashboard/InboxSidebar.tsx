import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { InboxSidebarItem } from './InboxSidebarItem';
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
  Hash,
  ChevronDown, 
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sidebar content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Conversations section */}
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
            {t('conversations')}
          </h3>
          
          <InboxSidebarItem
            id="unread"
            label={t('unread')}
            icon={Inbox}
            count={conversationCounts.unread}
            isActive={selectedTab === 'unread'}
            onClick={() => onTabChange('unread')}
          />

          <InboxSidebarItem
            id="pending"
            label={t('pending')}
            icon={Clock}
            count={conversationCounts.pending}
            isActive={selectedTab === 'pending'}
            onClick={() => onTabChange('pending')}
          />

          <InboxSidebarItem
            id="closed"
            label={t('closed')}
            icon={Archive}
            count={conversationCounts.closed}
            isActive={selectedTab === 'closed'}
            onClick={() => onTabChange('closed')}
          />

          <InboxSidebarItem
            id="assigned"
            label={t('assignedToMe')}
            icon={Users}
            count={conversationCounts.assigned}
            isActive={selectedTab === 'assigned'}
            onClick={() => onTabChange('assigned')}
          />

          <InboxSidebarItem
            id="all"
            label={t('inbox')}
            icon={Inbox}
            count={conversationCounts.inbox}
            isActive={selectedTab === 'all'}
            onClick={() => onTabChange('all')}
          />

          <InboxSidebarItem
            id="notifications"
            label={t('notifications')}
            icon={Bell}
            count={unreadNotifications}
            isActive={selectedTab === 'notifications'}
            onClick={() => onTabChange('notifications')}
          />
        </div>

        <Separator />

        {/* Channels section */}
        <Collapsible open={expandedChannels} onOpenChange={setExpandedChannels}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded">
              {expandedChannels ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('channels')}
              </span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            <InboxSidebarItem
              id="email"
              label={t('email')}
              icon={Mail}
              count={conversationCounts.email}
              isActive={selectedTab === 'email'}
              onClick={() => onTabChange('email')}
            />

            <InboxSidebarItem
              id="facebook"
              label={t('facebook')}
              icon={MessageCircle}
              count={conversationCounts.facebook}
              isActive={selectedTab === 'facebook'}
              onClick={() => onTabChange('facebook')}
            />

            <InboxSidebarItem
              id="instagram"
              label={t('instagram')}
              icon={Camera}
              count={conversationCounts.instagram}
              isActive={selectedTab === 'instagram'}
              onClick={() => onTabChange('instagram')}
            />

            <InboxSidebarItem
              id="whatsapp"
              label={t('whatsapp')}
              icon={Phone}
              count={conversationCounts.whatsapp}
              isActive={selectedTab === 'whatsapp'}
              onClick={() => onTabChange('whatsapp')}
            />
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Custom inboxes section */}
        <Collapsible open={expandedInboxes} onOpenChange={setExpandedInboxes}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded">
              {expandedInboxes ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t('inboxes')}
              </span>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {inboxes?.filter(inbox => inbox.is_active).map((inbox) => (
              <InboxSidebarItem
                key={inbox.id}
                id={inbox.id}
                label={inbox.name}
                icon={Hash}
                count={inbox.conversation_count}
                isActive={selectedInboxId === inbox.id}
                onClick={() => onTabChange(inbox.id)}
              />
            ))}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};