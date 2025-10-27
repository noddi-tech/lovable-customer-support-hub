import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceTicketCard } from '@/components/service-tickets/ServiceTicketCard';
import { CreateTicketDialog } from '@/components/service-tickets/CreateTicketDialog';
import { ServiceTicketDetailsDialog } from '@/components/service-tickets/ServiceTicketDetailsDialog';
import { useServiceTickets } from '@/hooks/useServiceTickets';
import { useServiceTicketNotifications } from '@/hooks/useServiceTicketNotifications';
import { useRealtimeServiceTickets } from '@/hooks/useRealtimeServiceTickets';
import type { ServiceTicketStatus } from '@/types/service-tickets';

export default function ServiceTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceTicketStatus | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');

  // Initialize real-time updates and notifications
  useServiceTicketNotifications();
  useRealtimeServiceTickets();

  const { data: tickets = [], isLoading } = useServiceTickets();

  // Handle URL parameter for opening specific ticket
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId) {
      setSelectedTicketId(ticketId);
    }
  }, [searchParams]);

  // Clear URL parameter when closing ticket details
  const handleCloseTicketDetails = () => {
    setSelectedTicketId(null);
    searchParams.delete('ticket');
    setSearchParams(searchParams);
  };

  // Filter tickets based on search and status
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      searchQuery === '' ||
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;

    const matchesTab = activeTab === 'active' 
      ? !['completed', 'cancelled'].includes(ticket.status)
      : ['completed', 'cancelled'].includes(ticket.status);

    return matchesSearch && matchesStatus && matchesTab;
  });

  // Group by status for active tab
  const groupedTickets = {
    open: filteredTickets.filter((t) => t.status === 'open'),
    in_progress: filteredTickets.filter((t) => t.status === 'in_progress'),
    pending_customer: filteredTickets.filter((t) => t.status === 'pending_customer'),
    scheduled: filteredTickets.filter((t) => t.status === 'scheduled'),
    on_hold: filteredTickets.filter((t) => t.status === 'on_hold'),
    completed: filteredTickets.filter((t) => t.status === 'completed'),
    cancelled: filteredTickets.filter((t) => t.status === 'cancelled'),
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-semibold">Service Tickets</h1>
            <p className="text-sm text-muted-foreground">
              Track and manage customer service requests
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Ticket
          </Button>
        </div>

        {/* Filters */}
        <div className="px-4 pb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ServiceTicketStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="pending_customer">Pending Customer</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'closed')} className="h-full">
          <div className="border-b px-4">
            <TabsList>
              <TabsTrigger value="active">
                Active ({tickets.filter((t) => !['completed', 'cancelled'].includes(t.status)).length})
              </TabsTrigger>
              <TabsTrigger value="closed">
                Closed ({tickets.filter((t) => ['completed', 'cancelled'].includes(t.status)).length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="p-4 space-y-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'No tickets match your filters' : 'No active tickets'}
              </div>
            ) : (
              <>
                {groupedTickets.open.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">Open</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTickets.open.map((ticket) => (
                        <ServiceTicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  </div>
                )}
                {groupedTickets.in_progress.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">In Progress</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTickets.in_progress.map((ticket) => (
                        <ServiceTicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  </div>
                )}
                {groupedTickets.scheduled.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">Scheduled</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTickets.scheduled.map((ticket) => (
                        <ServiceTicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  </div>
                )}
                {groupedTickets.pending_customer.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">Pending Customer</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTickets.pending_customer.map((ticket) => (
                        <ServiceTicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  </div>
                )}
                {groupedTickets.on_hold.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">On Hold</h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {groupedTickets.on_hold.map((ticket) => (
                        <ServiceTicketCard key={ticket.id} ticket={ticket} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="closed" className="p-4">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery || statusFilter !== 'all' ? 'No tickets match your filters' : 'No closed tickets'}
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredTickets.map((ticket) => (
                  <ServiceTicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateTicketDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      
      {selectedTicketId && (
        <ServiceTicketDetailsDialog
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onOpenChange={handleCloseTicketDetails}
        />
      )}
    </div>
  );
}
