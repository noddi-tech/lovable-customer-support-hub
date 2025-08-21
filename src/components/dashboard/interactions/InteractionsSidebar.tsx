import React from 'react';
import { 
  Inbox, 
  Archive, 
  Send, 
  Trash2, 
  UserCheck, 
  Clock, 
  AlertCircle,
  MessageCircle,
  Mail,
  MessageSquare,
  Facebook,
  Instagram,
  Phone
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useInteractions } from '@/contexts/InteractionsContext';
import { useConversationCounts } from '@/hooks/useConversationCounts';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface InteractionsSidebarProps {
  selectedSection: string;
  onSectionChange: (section: string) => void;
}

export const InteractionsSidebar: React.FC<InteractionsSidebarProps> = ({
  selectedSection,
  onSectionChange
}) => {
  const { state } = useInteractions();
  const { t } = useTranslation();
  const conversationCounts = useConversationCounts();

  const sidebarSections = [
    {
      id: 'main',
      title: t('interactions.inbox', 'Inbox'),
      items: [
        {
          id: 'inbox',
          icon: Inbox,
          label: t('interactions.allConversations', 'All Conversations'),
          count: conversationCounts.data?.all || 0,
          badge: (conversationCounts.data?.unread || 0) > 0 ? conversationCounts.data?.unread : undefined
        },
        {
          id: 'assigned',
          icon: UserCheck,
          label: t('interactions.assignedToMe', 'Assigned to Me'),
          count: conversationCounts.data?.assigned || 0
        },
        {
          id: 'unassigned',
          icon: Clock,
          label: t('interactions.unassigned', 'Unassigned'),
          count: (conversationCounts.data?.all || 0) - (conversationCounts.data?.assigned || 0)
        },
        {
          id: 'urgent',
          icon: AlertCircle,
          label: t('interactions.urgent', 'Urgent'),
          count: 0, // TODO: Implement urgent count
          variant: 'destructive' as const
        }
      ]
    },
    {
      id: 'channels',
      title: t('interactions.channels', 'Channels'),
      items: [
        {
          id: 'email',
          icon: Mail,
          label: t('interactions.email', 'Email'),
          count: 0 // TODO: Implement channel counts
        },
        {
          id: 'chat',
          icon: MessageSquare,
          label: t('interactions.chat', 'Chat'),
          count: 0 // TODO: Implement channel counts
        },
        {
          id: 'social',
          icon: MessageCircle,
          label: t('interactions.social', 'Social'),
          count: 0 // TODO: Implement channel counts
        },
        {
          id: 'facebook',
          icon: Facebook,
          label: t('interactions.facebook', 'Facebook'),
          count: 0 // TODO: Implement channel counts
        },
        {
          id: 'instagram',
          icon: Instagram,
          label: t('interactions.instagram', 'Instagram'),
          count: 0 // TODO: Implement channel counts
        },
        {
          id: 'whatsapp',
          icon: Phone,
          label: t('interactions.whatsapp', 'WhatsApp'),
          count: 0 // TODO: Implement channel counts
        }
      ]
    },
    {
      id: 'archives',
      title: t('interactions.archives', 'Archives'),
      items: [
        {
          id: 'sent',
          icon: Send,
          label: t('interactions.sent', 'Sent'),
          count: 0 // TODO: Implement sent count
        },
        {
          id: 'archived',
          icon: Archive,
          label: t('interactions.archived', 'Archived'),
          count: conversationCounts.data?.archived || 0
        },
        {
          id: 'deleted',
          icon: Trash2,
          label: t('interactions.deleted', 'Deleted'),
          count: 0 // TODO: Implement deleted count
        }
      ]
    }
  ];

  const renderSidebarItems = (items: any[]) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isSelected = selectedSection === item.id;
      
      return (
        <Button
          key={item.id}
          variant={isSelected ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-between h-10 px-3 rounded-lg transition-all duration-200",
            isSelected && "bg-accent text-accent-foreground shadow-sm"
          )}
          onClick={() => onSectionChange(item.id)}
        >
          <div className="flex items-center gap-3">
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium truncate">{item.label}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {item.count > 0 && (
              <span className="text-xs text-muted-foreground min-w-0 flex-shrink-0">
                {item.count}
              </span>
            )}
            {item.badge && (
              <Badge 
                variant={item.variant || "default"} 
                className="h-5 min-w-5 text-xs flex items-center justify-center px-1"
              >
                {item.badge}
              </Badge>
            )}
          </div>
        </Button>
      );
    });
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-6">
      {sidebarSections.map((section, index) => (
        <div key={section.id} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
            {section.title}
          </h3>
          <div className="space-y-1">
            {renderSidebarItems(section.items)}
          </div>
          {index < sidebarSections.length - 1 && <Separator className="my-4" />}
        </div>
      ))}
    </div>
  );
};