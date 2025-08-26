import type { Meta, StoryObj } from '@storybook/react';
import { ReplySidebar } from '../components/detail/ReplySidebar';
import { useState } from 'react';

const meta: Meta<typeof ReplySidebar> = {
  title: 'Admin/Design/Detail/ReplySidebar',
  component: ReplySidebar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ReplySidebar>;

export const Default: Story = {
  args: {
    conversationId: 'conv-1',
    status: 'open',
    priority: 'normal',
    assignedTo: {
      id: 'user-1',
      name: 'Sarah Wilson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1c5?w=40&h=40&fit=crop&crop=face'
    },
    tags: ['billing', 'urgent'],
    onSendReply: async (text) => {
      console.log('Sending reply:', text);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    onStatusChange: (status) => console.log('Status changed to:', status),
    onPriorityChange: (priority) => console.log('Priority changed to:', priority),
    placeholder: 'Reply to customer...'
  },
};

export const WithoutMetadata: Story = {
  args: {
    conversationId: 'conv-2',
    onSendReply: async (text) => {
      console.log('Sending note:', text);
      await new Promise(resolve => setTimeout(resolve, 500));
    },
    showMetadata: false,
    placeholder: 'Add a note...'
  },
};

export const VoiceCallNotes: Story = {
  args: {
    conversationId: 'call-1',
    onSendReply: async (text) => {
      console.log('Adding call notes:', text);
      await new Promise(resolve => setTimeout(resolve, 800));
    },
    showMetadata: false,
    showActions: true,
    placeholder: 'Add call notes and follow-up actions...'
  },
};

export const NewsletterNotes: Story = {
  args: {
    conversationId: 'newsletter-1',
    onSendReply: async (text) => {
      console.log('Adding newsletter note:', text);
      await new Promise(resolve => setTimeout(resolve, 600));
    },
    showMetadata: false,
    showActions: false,
    placeholder: 'Add newsletter notes or feedback...'
  },
};

export const HighPriorityTicket: Story = {
  args: {
    conversationId: 'ticket-urgent',
    status: 'open',
    priority: 'urgent',
    assignedTo: {
      id: 'user-2', 
      name: 'Mike Chen'
    },
    tags: ['critical', 'database', 'outage'],
    onSendReply: async (text) => {
      console.log('Adding urgent response:', text);
      await new Promise(resolve => setTimeout(resolve, 1200));
    },
    onStatusChange: (status) => console.log('Urgent ticket status:', status),
    onPriorityChange: (priority) => console.log('Urgent ticket priority:', priority),
    placeholder: 'Respond to critical issue...'
  },
};

export const InteractiveDemo: Story = {
  render: () => {
    const [replyText, setReplyText] = useState('');
    const [status, setStatus] = useState<'open' | 'pending' | 'resolved' | 'closed'>('open');
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
    const [tags, setTags] = useState(['support', 'email']);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendReply = async (text: string) => {
      setIsLoading(true);
      console.log('Sending reply:', text);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setReplyText('');
      setIsLoading(false);
    };

    const handleAddTag = (tag: string) => {
      if (!tags.includes(tag)) {
        setTags([...tags, tag]);
      }
    };

    const handleRemoveTag = (tag: string) => {
      setTags(tags.filter(t => t !== tag));
    };

    return (
      <div className="max-w-sm">
        <ReplySidebar
          conversationId="interactive-demo"
          replyText={replyText}
          onReplyChange={setReplyText}
          status={status}
          priority={priority}
          tags={tags}
          assignedTo={{
            id: 'current-user',
            name: 'You',
          }}
          onSendReply={handleSendReply}
          onStatusChange={(status) => setStatus(status as 'open' | 'pending' | 'resolved' | 'closed')}
          onPriorityChange={(priority) => setPriority(priority as 'low' | 'normal' | 'high' | 'urgent')}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          isLoading={isLoading}
          placeholder="Type your response..."
        />
      </div>
    );
  },
};