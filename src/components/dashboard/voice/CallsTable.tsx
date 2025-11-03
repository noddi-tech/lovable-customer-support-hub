import { useState, useMemo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CallTableRow } from './CallTableRow';
import { TableHeaderCell } from '@/components/dashboard/conversation-list/TableHeaderCell';
import { Phone } from 'lucide-react';
import { sortByString, sortByDate, sortByNumber } from '@/utils/tableSorting';

interface CallsTableProps {
  calls: any[];
  onCallClick: (call: any) => void;
  selectedCallId?: string;
  onRemoveCall?: (callId: string) => void;
  onNavigateToEvents?: (callId: string) => void;
}

export function CallsTable({
  calls,
  onCallClick,
  selectedCallId,
  onRemoveCall,
  onNavigateToEvents,
}: CallsTableProps) {
  const [sortState, setSortState] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({
    key: '',
    direction: null,
  });

  const handleSort = (key: string) => {
    setSortState(prev => ({
      key,
      direction: prev.key === key 
        ? prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc'
        : 'asc'
    }));
  };

  const sortedCalls = useMemo(() => {
    if (!sortState.direction) return calls;

    const sorted = [...calls].sort((a, b) => {
      switch (sortState.key) {
        case 'phone':
          return sortByString(a.customer_phone, b.customer_phone, sortState.direction);
        case 'customer':
          return sortByString(a.customers?.full_name, b.customers?.full_name, sortState.direction);
        case 'status':
          return sortByString(a.status, b.status, sortState.direction);
        case 'direction':
          return sortByString(a.direction, b.direction, sortState.direction);
        case 'duration':
          return sortByNumber(a.duration_seconds, b.duration_seconds, sortState.direction);
        case 'time':
          return sortByDate(a.started_at, b.started_at, sortState.direction);
        case 'end_reason':
          return sortByString(a.end_reason, b.end_reason, sortState.direction);
        default:
          return 0;
      }
    });

    return sorted;
  }, [calls, sortState]);

  if (calls.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No calls found</p>
          <p className="text-sm text-muted-foreground">Call history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10 border-b">
          <TableRow className="hover:bg-transparent">
            <TableHeaderCell
              label="Direction"
              sortKey="direction"
              currentSort={sortState}
              onSort={handleSort}
              className="w-24"
            />
            <TableHeaderCell
              label="Phone"
              sortKey="phone"
              currentSort={sortState}
              onSort={handleSort}
              className="w-36"
            />
            <TableHeaderCell
              label="Customer"
              sortKey="customer"
              currentSort={sortState}
              onSort={handleSort}
              className="w-48"
            />
            <TableHeaderCell
              label="Status"
              sortKey="status"
              currentSort={sortState}
              onSort={handleSort}
              className="w-28"
            />
            <TableHeaderCell
              label="Duration"
              sortKey="duration"
              currentSort={sortState}
              onSort={handleSort}
              className="w-24"
            />
            <TableHeaderCell
              label="End Reason"
              sortKey="end_reason"
              currentSort={sortState}
              onSort={handleSort}
              className="w-48"
            />
            <TableHeaderCell
              label="Time"
              sortKey="time"
              currentSort={sortState}
              onSort={handleSort}
              className="w-32"
            />
            <TableHeaderCell
              label="Notes"
              sortKey="notes"
              currentSort={sortState}
              onSort={handleSort}
              className="w-20"
            />
            <TableHead className="w-12 p-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCalls.map((call) => (
            <CallTableRow
              key={call.id}
              call={call}
              isSelected={selectedCallId === call.id}
              onClick={() => onCallClick(call)}
              onRemove={onRemoveCall}
              onNavigateToEvents={onNavigateToEvents}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
