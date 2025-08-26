import React from 'react';
import { MasterDetailShell, InboxList } from '@/components/admin/design/components/layouts';
import { EntityListRow } from '@/components/admin/design/components/lists';
import { ReplySidebar } from '@/components/admin/design/components/detail';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Clock, AlertTriangle, CheckCircle, Tag, Ticket } from 'lucide-react';
import { useInteractionsNavigation } from '@/hooks/useInteractionsNavigation';
import { formatDistanceToNow } from 'date-fns';

// Mock data for service tickets
const mockServiceTickets = [
  {
    id: 'ticket1',
    title: 'Database Connection Timeout Issues',
    subtitle: 'Production database experiencing intermittent connection timeouts • Assigned to: DevOps Team',
    status: 'open' as const,
    priority: 'urgent' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 45 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'ticket2',
    title: 'User Authentication Failures',
    subtitle: 'Multiple users reporting login issues with OAuth providers • Assigned to: Backend Team',
    status: 'in-progress' as const,
    priority: 'high' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 2 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'ticket3',
    title: 'Email Delivery Delays',
    subtitle: 'Notification emails experiencing 15-minute delays • Assigned to: Infrastructure Team',
    status: 'resolved' as const,
    priority: 'normal' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 4 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'ticket4',
    title: 'Mobile App Crash on iOS 17',
    subtitle: 'App crashes on launch for iOS 17 users • Assigned to: Mobile Team',
    status: 'open' as const,
    priority: 'high' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 6 * 60 * 60 * 1000), { addSuffix: true })
  },
  {
    id: 'ticket5',
    title: 'API Rate Limiting Configuration',
    subtitle: 'Need to adjust rate limits for enterprise clients • Assigned to: Platform Team',
    status: 'pending' as const,
    priority: 'low' as const,
    timestamp: formatDistanceToNow(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), { addSuffix: true })
  }
];

// Mock ticket details
const mockTicketDetails = {
  'ticket1': {
    title: 'Database Connection Timeout Issues',
    description: 'Production database experiencing intermittent connection timeouts affecting user authentication and data retrieval operations.',
    status: 'open',
    priority: 'urgent',
    assignee: 'DevOps Team',
    reporter: 'System Monitor',
    created: '45 minutes ago',
    updated: '15 minutes ago',
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
      },
      {
        time: '15 minutes ago',
        action: 'Investigation started',
        details: 'Checking connection pool configuration and database logs',
        user: 'DevOps Team'
      }
    ],
    technicalDetails: {
      errorMessages: [
        'Connection timeout after 30 seconds',
        'Connection pool exhausted (50/50 connections active)',
        'Database server response time: 45.2s (normal: 2.1s)'
      ],
      affectedServices: ['User Authentication', 'Data API', 'Reporting Dashboard'],
      severity: 'High - Multiple services impacted'
    }
  },
  'ticket2': {
    title: 'User Authentication Failures',
    description: 'Multiple users reporting inability to log in using OAuth providers (Google, GitHub, Microsoft).',
    status: 'in-progress',
    priority: 'high',
    assignee: 'Backend Team',
    reporter: 'Support Team',
    created: '2 hours ago',
    updated: '30 minutes ago',
    category: 'Authentication',
    tags: ['oauth', 'login', 'users'],
    timeline: [
      {
        time: '2 hours ago',
        action: 'Ticket created',
        details: 'Multiple user reports via support channels',
        user: 'Support Team'
      },
      {
        time: '1 hour ago',
        action: 'Root cause identified',
        details: 'OAuth configuration change deployed yesterday causing issues',
        user: 'Backend Team'
      },
      {
        time: '30 minutes ago',
        action: 'Fix in progress',
        details: 'Reverting configuration and testing',
        user: 'Backend Team'
      }
    ],
    technicalDetails: {
      errorMessages: [
        'OAuth callback URL mismatch',
        'Invalid client configuration',
        'Token validation failed'
      ],
      affectedServices: ['User Login', 'Account Registration', 'Profile Management'],
      severity: 'High - User access blocked'
    }
  },
  'ticket3': {
    title: 'Email Delivery Delays',
    description: 'Notification emails experiencing delays of 10-15 minutes, affecting user experience.',
    status: 'resolved',
    priority: 'normal',
    assignee: 'Infrastructure Team',
    reporter: 'QA Team',
    created: '4 hours ago',
    updated: '1 hour ago',
    category: 'Email',
    tags: ['email', 'notifications', 'delays'],
    timeline: [
      {
        time: '4 hours ago',
        action: 'Ticket created',
        details: 'QA testing discovered email delays',
        user: 'QA Team'
      },
      {
        time: '3 hours ago',
        action: 'Investigation completed',
        details: 'Email queue backlog due to high volume',
        user: 'Infrastructure Team'
      },
      {
        time: '1 hour ago',
        action: 'Resolution deployed',
        details: 'Increased email worker capacity and cleared backlog',
        user: 'Infrastructure Team'
      }
    ],
    technicalDetails: {
      errorMessages: [
        'Email queue depth: 15,000 messages (normal: <100)',
        'Worker processing rate: 50/min (normal: 500/min)',
        'Average delivery time: 14.5 minutes (SLA: <2 minutes)'
      ],
      affectedServices: ['Email Notifications', 'Password Reset', 'Welcome Messages'],
      severity: 'Medium - Delayed but functional'
    }
  }
};

const ServiceTicketsPage: React.FC = () => {
  const navigation = useInteractionsNavigation();
  const { conversationId } = navigation.currentState;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in-progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'open': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'normal': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'low': return <Clock className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderTicketsList = () => (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold mb-4">Service Tickets</h2>
      {mockServiceTickets.map((ticket) => (
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
          isSelected={conversationId === ticket.id}
          onClick={() => navigation.navigateToConversation(ticket.id)}
        />
      ))}
    </div>
  );

  const renderTicketDetail = () => {
    if (!conversationId) return null;
    
    const ticket = mockTicketDetails[conversationId as keyof typeof mockTicketDetails];
    if (!ticket) {
      return <div className="text-center py-8 text-muted-foreground">Ticket details not found.</div>;
    }

    return (
      <div className="space-y-6">
        {/* Ticket Overview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{ticket.title}</h3>
                <p className="text-muted-foreground mt-1">{ticket.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {getPriorityIcon(ticket.priority)}
                <Badge className={getStatusColor(ticket.status)}>
                  {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assignee</p>
                <p className="text-foreground">{ticket.assignee}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reporter</p>
                <p className="text-foreground">{ticket.reporter}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-foreground">{ticket.created}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-foreground">{ticket.category}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {ticket.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <h4 className="font-semibold text-foreground">Technical Details</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Error Messages</p>
                <div className="bg-muted/50 p-3 rounded-lg">
                  {ticket.technicalDetails.errorMessages.map((error, index) => (
                    <p key={index} className="text-sm font-mono text-foreground mb-1">• {error}</p>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Affected Services</p>
                <div className="flex flex-wrap gap-2">
                  {ticket.technicalDetails.affectedServices.map((service) => (
                    <Badge key={service} variant="secondary">{service}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Severity</p>
                <p className="text-foreground">{ticket.technicalDetails.severity}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <h4 className="font-semibold text-foreground">Timeline</h4>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ticket.timeline.map((event, index) => (
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
  };

  const renderTicketActions = () => {
    if (!conversationId) return null;
    
    const ticket = mockTicketDetails[conversationId as keyof typeof mockTicketDetails];
    if (!ticket) return null;

    return (
      <ReplySidebar
        title="Ticket Actions"
        recipientLabel="Update Status"
        placeholder="Add a comment or update..."
        onSend={(message) => {
          console.log('Adding comment to ticket:', conversationId, 'Message:', message);
        }}
        actions={
          <div className="space-y-2">
            {ticket.status !== 'resolved' && (
              <Button variant="default" size="sm" className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Resolved
              </Button>
            )}
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
  };

  const ticketInboxes = [
    { id: 'open', name: 'Open Tickets', count: 2, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-red-600' },
    { id: 'in-progress', name: 'In Progress', count: 1, icon: <Clock className="h-4 w-4" />, color: 'text-blue-600' },
    { id: 'resolved', name: 'Resolved', count: 1, icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
    { id: 'pending', name: 'Pending', count: 1, icon: <Tag className="h-4 w-4" />, color: 'text-yellow-600' },
  ];

  return (
    <MasterDetailShell
      isDetail={!!conversationId}
      onBack={() => navigation.clearConversation()}
      left={
        <InboxList
          inboxes={ticketInboxes}
          selectedInbox={navigation.currentState.selectedInboxId}
          onInboxSelect={navigation.navigateToInbox}
        />
      }
      center={renderTicketsList()}
      detailLeft={renderTicketDetail()}
      detailRight={renderTicketActions()}
      backButtonLabel="Back to Tickets"
      leftPaneLabel="Ticket categories"
      centerPaneLabel="Service tickets list"
      detailLeftLabel="Ticket details"
      detailRightLabel="Ticket actions"
    />
  );
};

export default ServiceTicketsPage;