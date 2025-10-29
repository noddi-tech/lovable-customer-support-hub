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
import { ServiceTicketListHeader } from '@/components/service-tickets/ServiceTicketListHeader';
import { TeamWorkloadStats } from '@/components/service-tickets/TeamWorkloadStats';
import { TicketAnalyticsDashboard } from '@/components/service-tickets/TicketAnalyticsDashboard';
import { VirtualizedTicketList } from '@/components/service-tickets/VirtualizedTicketList';
import { useServiceTickets } from '@/hooks/useServiceTickets';
import { useServiceTicketAnalytics } from '@/hooks/useServiceTicketAnalytics';
import { useServiceTicketNotifications } from '@/hooks/useServiceTicketNotifications';
import { useRealtimeServiceTickets } from '@/hooks/useRealtimeServiceTickets';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ServiceTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filters, setFilters] = useState<TicketFilters>({});
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const { data: tickets = [] } = useServiceTickets();
  const { data: teamMembers = [] } = useTeamMembers();
  const analytics = useServiceTicketAnalytics(tickets);
  const queryClient = useQueryClient();
  
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
    try {
      console.log(`🔄 Bulk updating ${selectedTicketIds.length} tickets:`, updates);
      
      const updatePromises = selectedTicketIds.map(async (ticketId) => {
        const updateData: any = {};
        if (updates.status) updateData.status = updates.status;
        if (updates.priority) updateData.priority = updates.priority;
        if (updates.assignedTo) updateData.assigned_to_id = updates.assignedTo;
        
        const { error } = await supabase
          .from('service_tickets')
          .update(updateData)
          .eq('id', ticketId);
          
        if (error) {
          console.error(`❌ Failed to update ticket ${ticketId}:`, error);
          throw error;
        }
      });
      
      await Promise.all(updatePromises);
      
      // Invalidate cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
      
      console.log(`✅ Successfully bulk updated ${selectedTicketIds.length} tickets`);
    } catch (error) {
      console.error('❌ Bulk update failed:', error);
      throw error; // Re-throw so the component can show error toast
    }
  };

  const handleBulkDelete = async () => {
    try {
      console.log(`🗑️  Deleting ${selectedTicketIds.length} tickets`);
      
      const deletePromises = selectedTicketIds.map(async (ticketId) => {
        const { error } = await supabase
          .from('service_tickets')
          .delete()
          .eq('id', ticketId);
          
        if (error) {
          console.error(`❌ Failed to delete ticket ${ticketId}:`, error);
          throw error;
        }
      });
      
      await Promise.all(deletePromises);
      
      // Invalidate cache to refresh UI
      queryClient.invalidateQueries({ queryKey: ['service-tickets'] });
      
      toast.success(`Deleted ${selectedTicketIds.length} ticket(s)`);
      setSelectedTicketIds([]);
      
      console.log(`✅ Successfully deleted ${selectedTicketIds.length} tickets`);
    } catch (error) {
      console.error('❌ Bulk delete failed:', error);
      toast.error('Failed to delete tickets');
    }
  };

  const [activeTab, setActiveTab] = useState('all');

  const ticketsByStatus = {
    all: filteredTickets,
    open: filteredTickets.filter(t => t.status === 'open'),
    in_progress: filteredTickets.filter(t => t.status === 'in_progress'),
    pending: filteredTickets.filter(t => t.status === 'pending_customer' || t.status === 'awaiting_parts'),
    completed: filteredTickets.filter(t => t.status === 'completed'),
    cancelled: filteredTickets.filter(t => t.status === 'cancelled'),
  };

  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTicketIds(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId) 
        : [...prev, ticketId]
    );
  };

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Clear selections when exiting selection mode
      setSelectedTicketIds([]);
    }
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

      <ServiceTicketFilters 
        filters={filters} 
        onFiltersChange={setFilters}
        availableAssignees={teamMembers.map(m => ({ id: m.user_id, name: m.full_name }))}
      />
      {selectionMode && (
        <ServiceTicketBulkActions 
          selectedTicketIds={selectedTicketIds} 
          onClearSelection={() => setSelectedTicketIds([])} 
          onBulkUpdate={handleBulkUpdate}
          onDelete={handleBulkDelete}
          availableAssignees={teamMembers.map(m => ({ id: m.user_id, name: m.full_name }))}
        />
      )}

      {viewMode === 'list' ? (
        <div className="w-full">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All ({ticketsByStatus.all.length})</TabsTrigger>
              <TabsTrigger value="open">Open ({ticketsByStatus.open.length})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({ticketsByStatus.in_progress.length})</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6 space-y-4">
              <ServiceTicketListHeader
                ticketCount={ticketsByStatus.all.length}
                selectionMode={selectionMode}
                onToggleSelectionMode={toggleSelectionMode}
                onCreateTicket={() => setIsCreateDialogOpen(true)}
              />
              <div className="h-[calc(100vh-280px)] overflow-y-auto">
                <VirtualizedTicketList
                  tickets={ticketsByStatus.all}
                  selectedTicketIds={selectedTicketIds}
                  onSelectTicket={toggleTicketSelection}
                  onTicketClick={handleTicketClick}
                  selectionMode={selectionMode}
                />
              </div>
            </TabsContent>
            <TabsContent value="open" className="mt-6 space-y-4">
              <ServiceTicketListHeader
                ticketCount={ticketsByStatus.open.length}
                selectionMode={selectionMode}
                onToggleSelectionMode={toggleSelectionMode}
                onCreateTicket={() => setIsCreateDialogOpen(true)}
              />
              <div className="h-[calc(100vh-280px)] overflow-y-auto">
                <VirtualizedTicketList
                  tickets={ticketsByStatus.open}
                  selectedTicketIds={selectedTicketIds}
                  onSelectTicket={toggleTicketSelection}
                  onTicketClick={handleTicketClick}
                  selectionMode={selectionMode}
                />
              </div>
            </TabsContent>
            <TabsContent value="in_progress" className="mt-6 space-y-4">
              <ServiceTicketListHeader
                ticketCount={ticketsByStatus.in_progress.length}
                selectionMode={selectionMode}
                onToggleSelectionMode={toggleSelectionMode}
                onCreateTicket={() => setIsCreateDialogOpen(true)}
              />
              <div className="h-[calc(100vh-280px)] overflow-y-auto">
                <VirtualizedTicketList
                  tickets={ticketsByStatus.in_progress}
                  selectedTicketIds={selectedTicketIds}
                  onSelectTicket={toggleTicketSelection}
                  onTicketClick={handleTicketClick}
                  selectionMode={selectionMode}
                />
              </div>
            </TabsContent>
            <TabsContent value="analytics" className="space-y-4">
              <TicketAnalyticsDashboard analytics={analytics} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <ServiceTicketKanban tickets={filteredTickets} onTicketClick={(ticket) => setSelectedTicketId(ticket.id)} />
      )}

      <CreateTicketDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
      {selectedTicketId && <ServiceTicketDetailsDialog ticketId={selectedTicketId} open={!!selectedTicketId} onOpenChange={(open) => !open && setSelectedTicketId(null)} />}
    </div>
  );
}
