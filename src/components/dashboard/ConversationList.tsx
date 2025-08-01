import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  MessageCircle, 
  Camera, 
  Phone, 
  Clock,
  Star,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  customer: {
    name: string;
    email: string;
    avatar?: string;
  };
  subject: string;
  preview: string;
  channel: 'email' | 'facebook' | 'instagram' | 'whatsapp';
  status: 'open' | 'pending' | 'resolved';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isUnread: boolean;
  lastMessage: Date;
  assignee?: {
    name: string;
    avatar?: string;
  };
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation?: string;
  onSelectConversation: (id: string) => void;
}

// Mock data for demonstration
const mockConversations: Conversation[] = [
  {
    id: '1',
    customer: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@email.com',
      avatar: '/placeholder-avatar.jpg'
    },
    subject: 'Issue with recent order delivery',
    preview: 'Hi, I ordered a product last week and it still hasn\'t arrived. Could you please check the status of my order #12345?',
    channel: 'email',
    status: 'open',
    priority: 'high',
    isUnread: true,
    lastMessage: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    assignee: { name: 'John Doe' }
  },
  {
    id: '2',
    customer: {
      name: 'Mike Chen',
      email: 'mike.chen@email.com'
    },
    subject: 'Product question',
    preview: 'Does this product come with a warranty? I\'m particularly interested in the coverage for water damage.',
    channel: 'facebook',
    status: 'pending',
    priority: 'normal',
    isUnread: true,
    lastMessage: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
  },
  {
    id: '3',
    customer: {
      name: 'Lisa Anderson',
      email: 'lisa.anderson@email.com'
    },
    subject: 'Return request',
    preview: 'I would like to return this item as it doesn\'t fit properly. What\'s your return policy?',
    channel: 'instagram',
    status: 'resolved',
    priority: 'normal',
    isUnread: false,
    lastMessage: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  },
  {
    id: '4',
    customer: {
      name: 'David Wilson',
      email: 'david.wilson@email.com'
    },
    subject: 'Technical support needed',
    preview: 'The app keeps crashing when I try to access my account. This is very frustrating!',
    channel: 'whatsapp',
    status: 'open',
    priority: 'urgent',
    isUnread: true,
    lastMessage: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
  }
];

const channelIcons = {
  email: Mail,
  facebook: MessageCircle,
  instagram: Camera,
  whatsapp: Phone
};

const statusColors = {
  open: 'bg-primary text-primary-foreground',
  pending: 'bg-warning text-warning-foreground',
  resolved: 'bg-success text-success-foreground'
};

const priorityColors = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-warning',
  urgent: 'text-destructive'
};

export const ConversationList: React.FC<ConversationListProps> = ({ 
  conversations = mockConversations, 
  selectedConversation, 
  onSelectConversation 
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="w-full md:w-96 bg-card border-r border-border h-full flex flex-col">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-base md:text-lg font-semibold text-foreground">Conversations</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              {conversations.filter(c => c.isUnread).length} unread
            </Badge>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          const ChannelIcon = channelIcons[conversation.channel];
          const isSelected = selectedConversation === conversation.id;
          
          return (
            <div
              key={conversation.id}
              className={cn(
                "p-3 md:p-4 border-b border-border cursor-pointer transition-colors",
                isSelected ? "bg-inbox-selected" : "hover:bg-inbox-hover",
                conversation.isUnread && !isSelected ? "border-l-4 border-l-primary" : ""
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="flex items-start space-x-3">
                {/* Customer Avatar */}
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={conversation.customer.avatar} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {conversation.customer.name[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "font-medium text-sm truncate",
                        conversation.isUnread ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {conversation.customer.name}
                      </span>
                      <ChannelIcon className={cn(
                        "h-3 w-3 flex-shrink-0",
                        `text-channel-${conversation.channel}`
                      )} />
                    </div>
                    <div className="flex items-center space-x-1">
                      {conversation.priority === 'urgent' && (
                        <Star className="h-3 w-3 text-destructive fill-current" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.lastMessage)}
                      </span>
                    </div>
                  </div>

                  {/* Subject */}
                  <h4 className={cn(
                    "text-sm font-medium truncate mb-1",
                    conversation.isUnread ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {conversation.subject}
                  </h4>

                  {/* Preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {conversation.preview}
                  </p>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", statusColors[conversation.status])}
                      >
                        {conversation.status}
                      </Badge>
                      {conversation.assignee && (
                        <div className="flex items-center space-x-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={conversation.assignee.avatar} />
                            <AvatarFallback className="text-xs bg-muted">
                              {conversation.assignee.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {conversation.assignee.name}
                          </span>
                        </div>
                      )}
                    </div>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};