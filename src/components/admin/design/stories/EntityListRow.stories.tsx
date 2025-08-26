import type { Meta, StoryObj } from '@storybook/react';
import { EntityListRow } from '../components/lists/EntityListRow';
import { Mail, Phone, MessageSquare } from 'lucide-react';
import { useState } from 'react';

const meta: Meta<typeof EntityListRow> = {
  title: 'Admin/Design/Lists/EntityListRow',
  component: EntityListRow,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof EntityListRow>;

export const EmailConversation: Story = {
  args: {
    subject: 'Order #12345 - Shipping Question',
    preview: 'Hi, I was wondering about the shipping status of my recent order. Could you please provide an update on when it will arrive?',
    avatar: {
      fallback: 'JS',
      alt: 'John Smith'
    },
    badges: [
      { label: 'Unread', variant: 'default' },
      { label: 'High', variant: 'destructive' }
    ],
    meta: [
      { label: 'From', value: 'John Smith' },
      { label: 'Channel', value: 'Email' },
      { label: 'Time', value: '2 hours ago' }
    ]
  },
};

export const VoiceCall: Story = {
  args: {
    subject: '+1 (555) 123-4567',
    preview: 'Incoming call • Completed • 5m 23s',
    leading: <Phone className="h-8 w-8 p-2 bg-blue-100 text-blue-600 rounded-full" />,
    badges: [
      { label: 'Incoming', variant: 'default' },
      { label: 'Completed', variant: 'secondary' }
    ],
    meta: [
      { label: 'Duration', value: '5m 23s' },
      { label: 'Agent', value: 'Sarah Wilson' },
      { label: 'Time', value: '10:30 AM' }
    ]
  },
};

export const ChatMessage: Story = {
  args: {
    subject: 'Live Chat Session #789',
    preview: 'Customer asking about product features and pricing options for the premium plan.',
    leading: <MessageSquare className="h-8 w-8 p-2 bg-green-100 text-green-600 rounded-full" />,
    badges: [
      { label: 'Active', variant: 'default' },
      { label: 'Urgent', variant: 'destructive' }
    ],
    meta: [
      { label: 'Customer', value: 'Anonymous' },
      { label: 'Duration', value: '12 minutes' },
      { label: 'Agent', value: 'Mike Chen' }
    ]
  },
};

export const Selected: Story = {
  args: {
    ...EmailConversation.args,
    selected: true,
  },
};

export const WithoutPreview: Story = {
  args: {
    subject: 'Quick Question',
    avatar: {
      fallback: 'AB',
      alt: 'Alice Brown'
    },
    badges: [
      { label: 'Resolved', variant: 'secondary' }
    ],
    meta: [
      { label: 'From', value: 'Alice Brown' },
      { label: 'Time', value: '1 day ago' }
    ]
  },
};

export const InteractiveDemo: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | null>(null);
    
    const conversations = [
      {
        id: '1',
        subject: 'Order #12345 - Shipping Question',
        preview: 'Hi, I was wondering about the shipping status of my recent order.',
        avatar: { fallback: 'JS', alt: 'John Smith' },
        badges: [{ label: 'Unread', variant: 'default' as const }]
      },
      {
        id: '2', 
        subject: 'Product Return Request',
        preview: 'I need to return the blue sweater I ordered last week.',
        avatar: { fallback: 'SJ', alt: 'Sarah Johnson' },
        badges: [{ label: 'Pending', variant: 'secondary' as const }]
      },
      {
        id: '3',
        subject: '+1 (555) 987-6543',
        preview: 'Missed call • 2m 15s',
        leading: <Phone className="h-8 w-8 p-2 bg-red-100 text-red-600 rounded-full" />,
        badges: [{ label: 'Missed', variant: 'destructive' as const }]
      }
    ];

    return (
      <div className="space-y-2 max-w-md">
        <h3 className="font-semibold mb-4">Interactive Entity List</h3>
        {conversations.map((conv) => (
          <EntityListRow
            key={conv.id}
            subject={conv.subject}
            preview={conv.preview}
            avatar={conv.avatar}
            leading={conv.leading}
            badges={conv.badges}
            selected={selected === conv.id}
            onClick={() => setSelected(selected === conv.id ? null : conv.id)}
            meta={[
              { label: 'Updated', value: '2 hours ago' }
            ]}
          />
        ))}
      </div>
    );
  },
};

export const LinkVariant: Story = {
  args: {
    ...EmailConversation.args,
    href: '#conversation-link',
  },
};