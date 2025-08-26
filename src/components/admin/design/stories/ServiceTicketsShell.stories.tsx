import type { Meta, StoryObj } from '@storybook/react';
import { MasterDetailShell } from '../components/layouts/MasterDetailShell';
import { EntityListRow } from '../components/lists/EntityListRow';
import { ReplySidebar } from '../components/detail/ReplySidebar';
import { InboxList } from '../components/layouts/InboxList';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, Tag, Ticket, User } from 'lucide-react';
import { BrowserRouter } from 'react-router-dom';

const meta: Meta<typeof MasterDetailShell> = {
  title: 'Design System/Patterns/Service Tickets Shell',
  component: MasterDetailShell,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <BrowserRouter>
        <div className="h-screen">
          <Story />
        </div>
      </BrowserRouter>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MasterDetailShell>;

const mockTickets = [
  {
    id: 'ticket1',
    title: 'Database Connection Timeout Issues',
    subtitle: 'Production database experiencing intermittent connection timeouts • Assigned to: DevOps Team',
    status: 'open' as const,
    priority: 'urgent' as const,
    timestamp: '45 minutes ago'
  },
  {
    id: 'ticket2',
    title: 'User Authentication Failures',
    subtitle: 'Multiple users reporting login issues with OAuth providers • Assigned to: Backend Team',
    status: 'in-progress' as const,
    priority: 'high' as const,
    timestamp: '2 hours ago'
  },
  {
    id: 'ticket3',
    title: 'Email Delivery Delays',
    subtitle: 'Notification emails experiencing 15-minute delays • Assigned to: Infrastructure Team',
    status: 'resolved' as const,
    priority: 'normal' as const,
    timestamp: '4 hours ago'
  },
];

const mockTicketDetails = {
  'ticket1': {
    title: 'Database Connection Timeout Issues',
    description: 'Production database experiencing intermittent connection timeouts affecting user authentication and data retrieval operations.',
    status: 'open',
    priority: 'urgent',
    assignee: 'DevOps Team',
    reporter: 'System Monitor',
    created: '45 minutes ago',
    category: 'Infrastructure',
    tags: ['database', 'timeout', 'production'],
    timeline: [
      {
        time: '45 minutes ago',
        action: 'Ticket created',
        details: 'Automated alert triggered by monitoring system',
        user: 'System Monitor'
      },
      {
        time: '30 minutes ago',
        action: 'Assigned to DevOps Team',
        details: 'High priority database issue escalated',
        user: 'On-call Manager'
      }
    ]
  }
};

const ticketInboxes = [
  { id: 'open', name: 'Open Tickets', count: 2, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600' },
  { id: 'in-progress', name: 'In Progress', count: 1, icon: <Clock className="h-4 w-4" />, color: 'text-blue-600' },
  { id: 'resolved', name: 'Resolved', count: 1, icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
  { id: 'pending', name: 'Pending', count: 1, icon: <Tag className="h-4 w-4" />, color: 'text-yellow-600' },
];

export const TicketsList: Story = {
  render: () => {
    const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
    const [selectedInbox, setSelectedInbox] = useState('open');

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
        case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
        case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
        case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      }
    };

    const renderTicketsList = () => (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold mb-4">Service Tickets</h2>
        {mockTickets.map((ticket) => (
          <EntityListRow
            key={ticket.id}
            leading={<Ticket className="h-5 w-5 text-muted-foreground" />}
            subject={ticket.title}
            preview={ticket.subtitle}
            timestamp={ticket.timestamp}
            badges={[
              { 
                label: ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' '), 
                className: getStatusColor(ticket.status) 
              }
            ]}
            metadata={[
              { label: "Priority", value: ticket.priority },
            ]}
            isSelected={selectedTicket === ticket.id}
            onClick={() => setSelectedTicket(ticket.id)}
          />
        ))}
      </div>
    );

    return (
      <MasterDetailShell
        isDetail={false}
        onBack={() => setSelectedTicket(null)}
        left={
          <InboxList
            selectedInbox={selectedInbox}
            selectedStatus="all"
            onInboxSelect={setSelectedInbox}
            onStatusSelect={() => {}}
          />
        }
        center={renderTicketsList()}
        backButtonLabel="Back to Tickets"
        leftPaneLabel="Ticket categories"
        centerPaneLabel="Service tickets list"
      />
    );
  },
};

export const TicketDetail: Story = {
  render: () => {
    const [selectedTicket, setSelectedTicket] = useState<string>('ticket1');
    const [selectedInbox, setSelectedInbox] = useState('open');

    const ticket = mockTicketDetails[selectedTicket as keyof typeof mockTicketDetails];

    const renderTicketDetail = () => (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{ticket?.title}</h3>
                <p className="text-muted-foreground mt-1">{ticket?.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  Open
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assignee</p>
                <p className="text-foreground">{ticket?.assignee}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reporter</p>
                <p className="text-foreground">{ticket?.reporter}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-foreground">{ticket?.created}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-foreground">{ticket?.category}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {ticket?.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h4 className="font-semibold text-foreground">Timeline</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticket?.timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-medium text-foreground">{event.action}</p>
                      <span className="text-sm text-muted-foreground">{event.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.details}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <User className="h-3 w-3" />
                      {event.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );

    const renderTicketActions = () => (
      <ReplySidebar
        onSend={(message) => {
          console.log('Adding comment to ticket:', selectedTicket, 'Message:', message);
        }}
        actions={
          <div className="space-y-2">
            <Button variant="default" size="sm" className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Resolved
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              <User className="h-4 w-4 mr-2" />
              Reassign
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              <Tag className="h-4 w-4 mr-2" />
              Edit Tags
            </Button>
          </div>
        }
      />
    );

    return (
      <MasterDetailShell
        isDetail={true}
        onBack={() => setSelectedTicket('')}
        detailLeft={renderTicketDetail()}
        detailRight={renderTicketActions()}
        backButtonLabel="Back to Tickets"
        detailLeftLabel="Ticket details"
        detailRightLabel="Ticket actions"
      />
    );
  },
};

export const MobileView: Story = {
  render: () => {
    const [selectedTicket, setSelectedTicket] = useState<string>('ticket1');
    
    const ticket = mockTicketDetails[selectedTicket as keyof typeof mockTicketDetails];
    
    const renderTicketDetail = () => (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">{ticket?.title}</h3>
            <p className="text-muted-foreground">{ticket?.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge className="bg-red-100 text-red-800">Open</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Assignee:</span>
                <span className="text-sm">{ticket?.assignee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Priority:</span>
                <span className="text-sm">Urgent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );

    const renderTicketActions = () => (
      <ReplySidebar
        onSend={(message) => console.log('Comment:', message)}
        actions={
          <div className="space-y-2">
            <Button size="sm" className="w-full">Resolve</Button>
            <Button variant="outline" size="sm" className="w-full">Reassign</Button>
          </div>
        }
      />
    );

    return (
      <MasterDetailShell
        isDetail={true}
        onBack={() => setSelectedTicket('')}
        detailLeft={renderTicketDetail()}
        detailRight={renderTicketActions()}
        backButtonLabel="Back"
      />
    );
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};