import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NoddiTicketTable } from '@/components/noddi-tickets/NoddiTicketTable';
import {
  NoddiTicketFilters,
  type NoddiTicketFilterState,
} from '@/components/noddi-tickets/NoddiTicketFilters';
import { CreateNoddiTicketDialog } from '@/components/noddi-tickets/CreateNoddiTicketDialog';
import { NoddiTicketDetailsSheet } from '@/components/noddi-tickets/NoddiTicketDetailsSheet';
import { useNoddiServiceDepartments, useNoddiTickets } from '@/hooks/useNoddiTickets';
import type { NoddiTicketListParams, NoddiTicketStatus } from '@/types/noddiTicket';

const PAGE_SIZE = 25;

const STATUS_TABS: Array<{ value: string; label: string; statuses: NoddiTicketStatus[] }> = [
  { value: 'open', label: 'Open', statuses: ['OPEN'] },
  { value: 'snoozed', label: 'Snoozed', statuses: ['SNOOZED'] },
  { value: 'resolved', label: 'Resolved', statuses: ['RESOLVED'] },
  { value: 'archived', label: 'Archived', statuses: ['ARCHIVED'] },
  { value: 'all', label: 'All', statuses: [] },
];

export default function ServiceTickets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusTab, setStatusTab] = useState('open');
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<NoddiTicketFilterState>({
    search: '',
    priority: 'ALL',
    category: 'ALL',
    departmentId: null,
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: departments = [] } = useNoddiServiceDepartments();

  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId && /^\d+$/.test(ticketId)) setSelectedTicketId(Number(ticketId));
  }, [searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    setPage(0);
  }, [statusTab, debouncedSearch, filters.priority, filters.category, filters.departmentId]);

  const params = useMemo<NoddiTicketListParams>(() => {
    const tab = STATUS_TABS.find((t) => t.value === statusTab);
    return {
      page_index: page,
      page_size: PAGE_SIZE,
      ordering: '-created_at',
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(tab?.statuses.length ? { statuses: tab.statuses } : {}),
      ...(filters.priority !== 'ALL' ? { priorities: [filters.priority] } : {}),
      ...(filters.category !== 'ALL' ? { categories: [filters.category] } : {}),
      ...(filters.departmentId ? { service_department_ids: [filters.departmentId] } : {}),
    };
  }, [statusTab, page, debouncedSearch, filters]);

  const { data, isLoading, isFetching, refetch } = useNoddiTickets(params);
  const tickets = data?.results ?? [];
  const total = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSelect = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    const next = new URLSearchParams(searchParams);
    next.set('ticket', String(ticketId));
    setSearchParams(next, { replace: true });
  };

  const handleCloseDetails = (open: boolean) => {
    if (open) return;
    setSelectedTicketId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('ticket');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain space-y-4 p-3 pb-24 md:p-6 md:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <SidebarTrigger className="mt-0.5 shrink-0 md:hidden" />
          <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Ops tickets</h1>
          <p className="text-xs text-muted-foreground md:text-sm">
            Creates operational tickets for a service department in Navio. Tickets live in the Navio
            backend and show up in their app — Support Hub only reads and creates them.
          </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 flex-1 sm:h-9 sm:flex-none"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" className="h-10 flex-1 sm:h-9 sm:flex-none" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New ops ticket
          </Button>
        </div>
      </div>

      <Tabs value={statusTab} onValueChange={setStatusTab}>
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList className="h-auto w-max min-w-0 justify-start gap-1">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="shrink-0">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        </div>
      </Tabs>


      <NoddiTicketFilters value={filters} onChange={setFilters} departments={departments} />

      <NoddiTicketTable tickets={tickets} isLoading={isLoading} onSelect={handleSelect} />

      <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          {total > 0
            ? `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`
            : 'No tickets'}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-8 sm:w-8"
            disabled={page === 0 || isFetching}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-8 sm:w-8"
            disabled={page + 1 >= totalPages || isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CreateNoddiTicketDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={handleSelect} />
      <NoddiTicketDetailsSheet ticketId={selectedTicketId} onOpenChange={handleCloseDetails} />
    </div>
  );
}
