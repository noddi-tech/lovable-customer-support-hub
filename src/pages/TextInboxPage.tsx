import React from 'react';
import { InboxLayout } from '@/components/layout/InboxLayout';
import { ResponsiveGrid, LayoutItem } from '@/components/admin/design/components/layouts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

// Mock data for conversations
const mockConversations = [
  {
    id: '1',
    title: 'Payment Issue - Credit Card Declined',
    subtitle: 'Customer unable to complete payment with Visa ending in 1234. Error code: DECLINED_INSUFFICIENT_FUNDS',
    status: 'open' as const,
    priority: 'high' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 2 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: '2',
    title: 'Account Access - Password Reset Request',
    subtitle: 'User john.doe@example.com requesting password reset. Security verification completed.',
    status: 'pending' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 4 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: '3',
    title: 'Feature Request - Dark Mode Support',
    subtitle: 'Multiple users requesting dark mode support for the dashboard interface.',
    status: 'resolved' as const,
    priority: 'low' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: '4',
    title: 'Bug Report - Calendar Not Loading',
    subtitle: 'Calendar widget showing blank screen on Chrome browser. Console errors related to date parsing.',
    status: 'open' as const,
    priority: 'urgent' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 30 * 60 * 1000), { addSuffix: true })
  },
  {
    id: '5',
    title: 'Billing Inquiry - Invoice Discrepancy',
    subtitle: 'Customer questioning charges on invoice #INV-2024-001. Amount discrepancy of $25.99',
    status: 'pending' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 6 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: '6',
    title: 'Technical Support - API Integration Help',
    subtitle: 'Developer needs assistance integrating REST API endpoints for user management.',
    status: 'open' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 12 * 60 * 60 * 1000), { addSuffix: true })
  }
];

// Mock messages for conversation details
const mockMessages = {
  '1': [
    {
      id: 'msg1',
      sender: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      content: 'Hi, I\'m trying to update my payment method but my credit card keeps getting declined. I\'ve confirmed with my bank that there are sufficient funds. Can you help?',
      timestamp: '2 hours ago',
      type: 'customer'
    },
    {
      id: 'msg2',
      sender: 'Support Agent',
      email: undefined,
      content: 'Hello Sarah, thank you for contacting us. I can see the payment failures in our system. Let me check your account details and payment processor logs.',
      timestamp: '1 hour ago',
      type: 'agent'
    },
    {
      id: 'msg3',
      sender: 'Support Agent',
      email: undefined,
      content: 'I found the issue - there\'s a temporary hold on international transactions from your bank. Please contact your bank to remove this restriction, or try using a different payment method.',
      timestamp: '45 minutes ago',
      type: 'agent'
    }
  ],
  '2': [
    {
      id: 'msg4',
      sender: 'John Doe',
      email: 'john.doe@example.com',
      content: 'I forgot my password and the reset email isn\'t coming through. I\'ve checked my spam folder. My email is john.doe@example.com',
      timestamp: '4 hours ago',
      type: 'customer'
    },
    {
      id: 'msg5',
      sender: 'Support Agent',
      email: undefined,
      content: 'Hi John, I can help you with that. I\'ve manually triggered a password reset. Please check your email in the next few minutes.',
      timestamp: '3 hours ago',
      type: 'agent'
    }
  ],
  '3': [
    {
      id: 'msg6',
      sender: 'Multiple Users',
      email: undefined,
      content: 'We would love to see dark mode support in the dashboard. It would be much easier on the eyes during late-night work sessions.',
      timestamp: '1 day ago',
      type: 'customer'
    },
    {
      id: 'msg7',
      sender: 'Product Team',
      email: undefined,
      content: 'Thank you for the feedback! Dark mode has been added to our development roadmap and will be available in the next major release.',
      timestamp: '1 day ago',
      type: 'agent'
    }
  ],
  '4': [
    {
      id: 'msg8',
      sender: 'Mike Wilson',
      email: 'mike.wilson@company.com',
      content: 'The calendar widget on my dashboard is completely blank. I\'ve tried refreshing and clearing cache but nothing works. This is urgent as I need to schedule meetings.',
      timestamp: '30 minutes ago',
      type: 'customer'
    }
  ],
  '5': [
    {
      id: 'msg9',
      sender: 'Lisa Chen',
      email: 'lisa.chen@business.net',
      content: 'I received invoice INV-2024-001 but there seems to be an extra charge of $25.99 that I don\'t recognize. Can you please clarify what this is for?',
      timestamp: '6 hours ago',
      type: 'customer'
    }
  ],
  '6': [
    {
      id: 'msg10',
      sender: 'Alex Developer',
      email: 'alex@techstartup.io',
      content: 'I\'m integrating your API for user management but getting 401 errors on all endpoints. I\'ve double-checked my API key. Can someone help debug this?',
      timestamp: '12 hours ago',
      type: 'customer'
    }
  ]
};

const TextInboxPage: React.FC = () => {
  const renderDetail = (conversationId: string) => {
    const messages = mockMessages[conversationId as keyof typeof mockMessages] || [];
    
    return (
      <div className="w-full px-4 sm:px-6 md:px-8 xl:px-12">
        <ResponsiveGrid cols={{ sm: '1' }} gap="4">
          {messages.map((message) => (
            <LayoutItem key={message.id}>
              <Card className={`${
                message.type === 'customer' 
                  ? 'bg-background border-primary/20' 
                  : 'bg-muted/50 border-muted'
              }`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-foreground">{message.sender}</h4>
                      {message.email && (
                        <p className="text-sm text-muted-foreground">{message.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={message.type === 'customer' ? 'default' : 'secondary'}>
                        {message.type === 'customer' ? 'Customer' : 'Agent'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground leading-relaxed">{message.content}</p>
                </CardContent>
              </Card>
            </LayoutItem>
          ))}
        </ResponsiveGrid>
        
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No messages in this conversation yet.</p>
          </div>
        )}
      </div>
    );
  };

  const handleReply = (conversationId: string, message: string) => {
    console.log('Sending reply to conversation:', conversationId, 'Message:', message);
    // Here you would typically send the message to your backend
  };

  return (
    <InboxLayout
      conversations={mockConversations}
      renderDetail={renderDetail}
      title="Text Inbox"
      onReply={handleReply}
      showReplyBox={true}
    />
  );
};

export default TextInboxPage;