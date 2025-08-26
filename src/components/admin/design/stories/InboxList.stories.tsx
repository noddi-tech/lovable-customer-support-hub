import type { Meta, StoryObj } from '@storybook/react';
import { InboxList } from '../components/layouts/InboxList';
import { useState } from 'react';
import { Mail, Inbox, Users, Archive, Star, AlertTriangle, Clock, CheckCircle, Tag } from 'lucide-react';

const meta: Meta<typeof InboxList> = {
  title: 'Design System/Layouts/InboxList',
  component: InboxList,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof InboxList>;

export const Default: Story = {
  render: () => {
    const [selectedInbox, setSelectedInbox] = useState('all');
    
    return (
      <div className="w-80 bg-background p-4 border rounded-lg">
        <InboxList
          selectedInbox={selectedInbox}
          onInboxSelect={setSelectedInbox}
        />
      </div>
    );
  },
};

export const ServiceTickets: Story = {
  render: () => {
    const [selectedInbox, setSelectedInbox] = useState('open');
    
    const ticketInboxes = [
      { id: 'open', name: 'Open Tickets', count: 2, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600' },
      { id: 'in-progress', name: 'In Progress', count: 1, icon: <Clock className="h-4 w-4" />, color: 'text-blue-600' },
      { id: 'resolved', name: 'Resolved', count: 1, icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
      { id: 'pending', name: 'Pending', count: 1, icon: <Tag className="h-4 w-4" />, color: 'text-yellow-600' },
    ];
    
    return (
      <div className="w-80 bg-background p-4 border rounded-lg">
        <InboxList
          inboxes={ticketInboxes}
          selectedInbox={selectedInbox}
          onInboxSelect={setSelectedInbox}
        />
      </div>
    );
  },
};

export const NewsletterInboxes: Story = {
  render: () => {
    const [selectedInbox, setSelectedInbox] = useState('drafts');
    
    const newsletterInboxes = [
      { id: 'drafts', name: 'Drafts', count: 5, icon: <Mail className="h-4 w-4" />, color: 'text-blue-600' },
      { id: 'scheduled', name: 'Scheduled', count: 3, icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600' },
      { id: 'sent', name: 'Sent', count: 12, icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
      { id: 'templates', name: 'Templates', count: 8, icon: <Star className="h-4 w-4" />, color: 'text-purple-600' },
    ];
    
    return (
      <div className="w-80 bg-background p-4 border rounded-lg">
        <InboxList
          inboxes={newsletterInboxes}
          selectedInbox={selectedInbox}
          onInboxSelect={setSelectedInbox}
        />
      </div>
    );
  },
};

export const NoSelection: Story = {
  render: () => {
    return (
      <div className="w-80 bg-background p-4 border rounded-lg">
        <InboxList />
      </div>
    );
  },
};

export const WithoutCounts: Story = {
  render: () => {
    const [selectedInbox, setSelectedInbox] = useState('all');
    
    const inboxesWithoutCounts = [
      { id: 'all', name: 'All Messages', count: 0, icon: <Mail className="h-4 w-4" /> },
      { id: 'unread', name: 'Unread', count: 0, icon: <Inbox className="h-4 w-4" /> },
      { id: 'archived', name: 'Archived', count: 0, icon: <Archive className="h-4 w-4" /> },
    ];
    
    return (
      <div className="w-80 bg-background p-4 border rounded-lg">
        <InboxList
          inboxes={inboxesWithoutCounts}
          selectedInbox={selectedInbox}
          onInboxSelect={setSelectedInbox}
        />
      </div>
    );
  },
};

export const CustomStyling: Story = {
  render: () => {
    const [selectedInbox, setSelectedInbox] = useState('important');
    
    return (
      <div className="w-80 bg-card p-6 border-2 border-primary/20 rounded-xl shadow-lg">
        <InboxList
          selectedInbox={selectedInbox}
          onInboxSelect={setSelectedInbox}
          className="space-y-3"
        />
      </div>
    );
  },
};

export const MobileView: Story = {
  render: () => {
    const [selectedInbox, setSelectedInbox] = useState('all');
    
    return (
      <div className="w-full max-w-sm bg-background p-4 border rounded-lg">
        <InboxList
          selectedInbox={selectedInbox}
          onInboxSelect={setSelectedInbox}
        />
      </div>
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};