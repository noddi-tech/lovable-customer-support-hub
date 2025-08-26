import type { Meta, StoryObj } from '@storybook/react';
import { MasterDetailShell } from '../components/layouts/MasterDetailShell';
import { EntityListRow } from '../components/lists/EntityListRow';
import { ReplySidebar } from '../components/detail/ReplySidebar';
import { InboxList } from '../components/layouts/InboxList';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useState } from 'react';

const meta: Meta<typeof MasterDetailShell> = {
  title: 'Admin/Design/Layouts/MasterDetailShell',
  component: MasterDetailShell,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MasterDetailShell>;

const mockInboxes = [
  { id: 'all', name: 'All Messages', count: 142 },
  { id: 'unread', name: 'Unread', count: 23 },
  { id: 'assigned', name: 'Assigned to Me', count: 8 },
];

const mockConversations = [
  {
    id: 'conv-1',
    subject: 'Order #12345 - Shipping Question',
    preview: 'Hi, I was wondering about the shipping status of my recent order.',
    customer: { name: 'John Smith', initials: 'JS' },
    isUnread: true,
  },
  {
    id: 'conv-2',
    subject: 'Product Return Request',
    preview: 'I need to return the blue sweater I ordered last week.',
    customer: { name: 'Sarah Johnson', initials: 'SJ' },
    isUnread: false,
  },
];

export const ListMode: Story = {
  render: () => {
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    
    const renderInboxList = () => (
      <InboxList selectedInbox="all" />
    );

    const renderConversationList = () => (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <div className="space-y-2">
          {mockConversations.map((conv) => (
            <EntityListRow
              key={conv.id}
              subject={conv.subject}
              preview={conv.preview}
              avatar={{ fallback: conv.customer.initials, alt: conv.customer.name }}
              selected={selectedConversation === conv.id}
              onClick={() => setSelectedConversation(conv.id)}
              badges={conv.isUnread ? [{ label: 'Unread', variant: 'default' }] : []}
              meta={[
                { label: 'From', value: conv.customer.name },
                { label: 'Channel', value: 'email' }
              ]}
            />
          ))}
        </div>
      </div>
    );

    return (
      <div className="h-screen">
        <MasterDetailShell
          left={renderInboxList()}
          center={renderConversationList()}
          isDetail={false}
          onBack={() => setSelectedConversation(null)}
        />
      </div>
    );
  },
};

export const DetailMode: Story = {
  render: () => {
    const [isDetail, setIsDetail] = useState(true);
    
    const renderMessageThread = () => (
      <Card className="h-full">
        <CardHeader>
          <h1 className="text-xl font-semibold">Order #12345 - Shipping Question</h1>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>John Smith:</strong> Hi, I was wondering about the shipping status 
                of my recent order. Could you please provide an update?
              </p>
              <p className="text-xs text-muted-foreground mt-2">2 hours ago</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Support:</strong> Hi John! Your order #12345 has been shipped 
                and should arrive within 2-3 business days. Here's your tracking number: 1Z999AA1234567890
              </p>
              <p className="text-xs text-muted-foreground mt-2">1 hour ago</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );

    const renderReplySidebar = () => (
      <ReplySidebar
        conversationId="conv-1"
        status="open"
        priority="normal"
        onSendReply={async (text) => console.log('Reply:', text)}
        placeholder="Reply to John..."
      />
    );

    return (
      <div className="h-screen">
        <MasterDetailShell
          detailLeft={renderMessageThread()}
          detailRight={renderReplySidebar()}
          isDetail={isDetail}
          onBack={() => setIsDetail(false)}
          backButtonLabel="Back to Inbox"
        />
      </div>
    );
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  render: () => {
    const [isDetail, setIsDetail] = useState(false);
    
    const renderConversationList = () => (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <div className="space-y-2">
          {mockConversations.map((conv) => (
            <EntityListRow
              key={conv.id}
              subject={conv.subject}
              preview={conv.preview}
              avatar={{ fallback: conv.customer.initials, alt: conv.customer.name }}
              onClick={() => setIsDetail(true)}
              badges={conv.isUnread ? [{ label: 'Unread', variant: 'default' }] : []}
            />
          ))}
        </div>
      </div>
    );

    const renderMessageThread = () => (
      <Card className="h-full">
        <CardContent className="p-4">
          <h1 className="text-lg font-semibold mb-4">Order #12345</h1>
          <div className="space-y-3">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm">Hi, I was wondering about the shipping status...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );

    const renderReplySidebar = () => (
      <ReplySidebar
        conversationId="conv-1"
        onSendReply={async (text) => console.log('Reply:', text)}
        showMetadata={false}
      />
    );

    return (
      <div className="h-screen">
        <MasterDetailShell
          center={renderConversationList()}
          detailLeft={renderMessageThread()}
          detailRight={renderReplySidebar()}
          isDetail={isDetail}
          onBack={() => setIsDetail(false)}
        />
      </div>
    );
  },
};