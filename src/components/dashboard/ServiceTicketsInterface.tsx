import React from 'react';
import { StandardThreePanelLayout } from '@/components/layout/StandardThreePanelLayout';
import { StandardActionToolbar } from '@/components/layout/StandardActionToolbar';
import { StandardListView } from '@/components/layout/StandardListView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ticket, 
  Plus, 
  Search, 
  Filter, 
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Calendar,
  Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// Mock ticket data
interface ServiceTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string;
  assignee?: string;
  reporter: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
}

const mockTickets: ServiceTicket[] = [
  {
    id: 'TK-001',
    title: 'Email server not responding',
    description: 'Users are unable to send emails through the company server',
    status: 'open',
    priority: 'high',
    category: 'Infrastructure',
    reporter: 'John Doe',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z',
    due_date: '2024-01-22T17:00:00Z'
  },
  {
    id: 'TK-002', 
    title: 'New employee onboarding',
    description: 'Setup accounts and access for new team member',
    status: 'in_progress',
    priority: 'normal',
    category: 'HR',
    assignee: 'Jane Smith',
    reporter: 'HR Team',
    created_at: '2024-01-19T14:30:00Z',
    updated_at: '2024-01-20T09:15:00Z'
  }
];

const ServiceTicketsInterface = () => {
  const { t } = useTranslation();
  const [selectedTicket, setSelectedTicket] = React.useState<ServiceTicket | null>(null);
  const [selectedSection, setSelectedSection] = React.useState('all');

  const getStatusIcon = (status: ServiceTicket['status']) => {
    switch (status) {
      case 'open': return AlertCircle;
      case 'in_progress': return Clock;
      case 'resolved': return CheckCircle2;
      case 'closed': return XCircle;
      default: return Ticket;
    }
  };

  const getStatusColor = (status: ServiceTicket['status']) => {
    switch (status) {
      case 'open': return 'destructive';
      case 'in_progress': return 'secondary';
      case 'resolved': return 'default';
      case 'closed': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: ServiceTicket['priority']) => {
    switch (priority) {
      case 'low': return 'outline';
      case 'normal': return 'secondary';
      case 'high': return 'default';
      case 'urgent': return 'destructive';
      default: return 'secondary';
    }
  };

  const header = (
    <StandardActionToolbar
      title={t('serviceTickets', 'Service Tickets')}
      breadcrumbs={[{ label: t('nav.operations', 'Operations') }, { label: t('serviceTickets', 'Service Tickets') }]}
      actionGroups={[
        {
          id: 'primary',
          actions: [
            {
              id: 'new-ticket',
              icon: Plus,
              label: t('tickets.newTicket', 'New Ticket'),
              onClick: () => console.log('New ticket'),
              variant: 'default'
            },
            {
              id: 'search',
              icon: Search,
              label: t('common.search', 'Search'),
              onClick: () => console.log('Search'),
              variant: 'outline'
            }
          ]
        },
        {
          id: 'secondary',
          actions: [
            {
              id: 'filter',
              icon: Filter,
              label: t('common.filter', 'Filter'),
              onClick: () => console.log('Filter'),
              variant: 'ghost'
            }
          ]
        }
      ]}
    />
  );

  const sidebar = (
    <div className="flex flex-col h-full p-4 space-y-6">
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3">
          {t('tickets.categories', 'Categories')}
        </h3>
        <div className="space-y-1">
          {[
            { id: 'all', label: t('tickets.allTickets', 'All Tickets'), count: mockTickets.length },
            { id: 'open', label: t('tickets.open', 'Open'), count: mockTickets.filter(t => t.status === 'open').length },
            { id: 'in_progress', label: t('tickets.inProgress', 'In Progress'), count: mockTickets.filter(t => t.status === 'in_progress').length },
            { id: 'resolved', label: t('tickets.resolved', 'Resolved'), count: mockTickets.filter(t => t.status === 'resolved').length },
            { id: 'assigned_to_me', label: t('tickets.assignedToMe', 'Assigned to Me'), count: 0 }
          ].map(item => (
            <Button
              key={item.id}
              variant={selectedSection === item.id ? "secondary" : "ghost"}
              className="w-full justify-between h-10 px-3"
              onClick={() => setSelectedSection(item.id)}
            >
              <span className="text-sm">{item.label}</span>
              {item.count > 0 && (
                <Badge variant="outline" className="h-5 min-w-5 text-xs">
                  {item.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTicketItem = (ticket: ServiceTicket) => {
    const StatusIcon = getStatusIcon(ticket.status);
    
    return (
      <Card 
        key={ticket.id} 
        className={cn(
          "cursor-pointer transition-all duration-200 hover:shadow-md border-l-4",
          selectedTicket?.id === ticket.id ? "ring-2 ring-primary/20 bg-accent/50" : "hover:bg-accent/20",
          ticket.priority === 'urgent' ? "border-l-destructive" : 
          ticket.priority === 'high' ? "border-l-orange-500" : "border-l-border"
        )}
        onClick={() => setSelectedTicket(ticket)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-medium line-clamp-1">{ticket.title}</CardTitle>
            <Badge variant={getPriorityColor(ticket.priority)} className="text-xs">
              {ticket.priority}
            </Badge>
          </div>
          <CardDescription className="text-xs line-clamp-2">
            {ticket.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-3 w-3" />
              <Badge variant={getStatusColor(ticket.status)} className="text-xs">
                {ticket.status.replace('_', ' ')}
              </Badge>
            </div>
            <span>{ticket.id}</span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span>{ticket.reporter}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              <span>{ticket.category}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const listView = (
    <StandardListView
      title={t('serviceTickets', 'Service Tickets')}
      items={mockTickets}
      renderItem={renderTicketItem}
      isLoading={false}
      emptyState={{
        icon: Ticket,
        title: t('tickets.noTickets', 'No tickets found'),
        description: t('tickets.noTicketsDesc', 'Create your first service ticket to get started.'),
        action: {
          label: t('tickets.newTicket', 'New Ticket'),
          onClick: () => console.log('Create new ticket')
        }
      }}
    />
  );

  const detailView = selectedTicket ? (
    <div className="h-full p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
          ← {t('common.back', 'Back')}
        </Button>
        <h1 className="text-lg font-semibold">{selectedTicket.title}</h1>
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('tickets.details', 'Ticket Details')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t('tickets.description', 'Description')}</label>
              <p className="text-sm mt-1">{selectedTicket.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('tickets.status', 'Status')}</label>
                <Badge variant={getStatusColor(selectedTicket.status)} className="mt-1">
                  {selectedTicket.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('tickets.priority', 'Priority')}</label>
                <Badge variant={getPriorityColor(selectedTicket.priority)} className="mt-1">
                  {selectedTicket.priority}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('tickets.reporter', 'Reporter')}</label>
                <p className="text-sm mt-1">{selectedTicket.reporter}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('tickets.category', 'Category')}</label>
                <p className="text-sm mt-1">{selectedTicket.category}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('tickets.created', 'Created')}</label>
                <p className="text-sm mt-1">{new Date(selectedTicket.created_at).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t('tickets.updated', 'Updated')}</label>
                <p className="text-sm mt-1">{new Date(selectedTicket.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('tickets.activity', 'Activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('tickets.noActivity', 'No activity yet')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  ) : null;

  return (
    <StandardThreePanelLayout
      storageKey="service-tickets"
      header={header}
      sidebar={sidebar}
      listView={listView}
      detailView={detailView}
      showDetailView={!!selectedTicket}
      onBack={() => setSelectedTicket(null)}
    />
  );
};

export default ServiceTicketsInterface;