import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, List, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ServiceTicketCard } from '@/components/service-tickets/ServiceTicketCard';
import { CreateTicketDialog } from '@/components/service-tickets/CreateTicketDialog';
import { ServiceTicketDetailsDialog } from '@/components/service-tickets/ServiceTicketDetailsDialog';
import { ServiceTicketKanban } from '@/components/service-tickets/ServiceTicketKanban';
import { ServiceTicketFilters, type TicketFilters } from '@/components/service-tickets/ServiceTicketFilters';
import { ServiceTicketBulkActions, type BulkUpdateData } from '@/components/service-tickets/ServiceTicketBulkActions';
import { useServiceTickets } from '@/hooks/useServiceTickets';
import { useServiceTicketNotifications } from '@/hooks/useServiceTicketNotifications';
import { useRealtimeServiceTickets } from '@/hooks/useRealtimeServiceTickets';
import { supabase } from '@/integrations/supabase/client';

export default function ServiceTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const { data: tickets = [] } = useServiceTickets();
  
  useServiceTicketNotifications();
  useRealtimeServiceTickets();

  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId) setSelectedTicketId(ticketId);
  }, [searchParams]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          ticket.ticket_number.toLowerCase().includes(searchLower) ||
          ticket.title.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      if (filters.status?.length && !filters.status.includes(ticket.status as any)) return false;
      if (filters.priority?.length && !filters.priority.includes(ticket.priority as any)) return false;
      if (filters.category?.length && !filters.category.includes(ticket.category)) return false;
      if (filters.assignedTo?.length && (!ticket.assigned_to_id || !filters.assignedTo.includes(ticket.assigned_to_id))) return false;
      if (filters.dateFrom && new Date(ticket.created_at) < filters.dateFrom) return false;
      if (filters.dateTo) {
        const dateTo = new Date(filters.dateTo);
        dateTo.setHours(23, 59, 59, 999);
        if (new Date(ticket.created_at) > dateTo) return false;
      }
      return true;
    });
  }, [tickets, filters]);

  const handleBulkUpdate = async (updates: BulkUpdateData) => {
    const updatePromises = selectedTicketIds.map(async (ticketId) => {
      const updateData: any = {};
      if (updates.status) updateData.status = updates.status;
      if (updates.priority) updateData.priority = updates.priority;
      if (updates.assignedTo) updateData.assigned_to_id = updates.assignedTo;
      const { error } = await supabase.from('service_tickets').update(updateData).eq('id', ticketId);
      if (error) throw error;
    });
    await Promise.all(updatePromises);
  };

  const ticketsByStatus = {
    open: filteredTickets.filter(t => t.status === 'open'),
    in_progress: filteredTickets.filter(t => t.status === 'in_progress'),
    scheduled: filteredTickets.filter(t => t.status === 'scheduled'),
    completed: filteredTickets.filter(t => t.status === 'completed'),
    closed: filteredTickets.filter(t => t.status === 'closed'),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Tickets</h1>
          <p className="text-muted-foreground mt-1">Manage service requests ({filteredTickets.length})</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('list')} className="rounded-r-none">
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === 'kanban' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('kanban')} className="rounded-l-none">
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Create Ticket
          </Button>
        </div>
      </div>

      <ServiceTicketFilters filters={filters} onFiltersChange={setFilters} />
      <ServiceTicketBulkActions selectedTicketIds={selectedTicketIds} onClearSelection={() => setSelectedTicketIds([])} onBulkUpdate={handleBulkUpdate} />

      {viewMode === 'list' ? (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({filteredTickets.length})</TabsTrigger>
            <TabsTrigger value="open">Open ({ticketsByStatus.open.length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({ticketsByStatus.in_progress.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="relative">
                  <div className="absolute top-3 left-3 z-10">
                    <Checkbox checked={selectedTicketIds.includes(ticket.id)} onCheckedChange={() => setSelectedTicketIds(prev => prev.includes(ticket.id) ? prev.filter(id => id !== ticket.id) : [...prev, ticket.id])} />
                  </div>
                  <ServiceTicketCard ticket={ticket} onClick={() => setSelectedTicketId(ticket.id)} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <ServiceTicketKanban tickets={filteredTickets} onTicketClick={(ticket) => setSelectedTicketId(ticket.id)} />
      )}

      <CreateTicketDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      {selectedTicketId && <ServiceTicketDetailsDialog ticketId={selectedTicketId} open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)} />}
    </div>
  );
}
