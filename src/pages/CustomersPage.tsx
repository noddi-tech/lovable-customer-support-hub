import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCustomersList } from '@/hooks/useCustomersList';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { Mail, Phone, Search, UserRound, MessageSquare } from 'lucide-react';
import { ContextMenu, ContextMenuContent, ContextMenuLabel, ContextMenuTrigger } from '@/components/ui/context-menu';
import { TagContextMenuItems } from '@/components/tags/TagContextMenuItems';
import { TagBadgeList } from '@/components/tags/TagBadge';
import { TagFilterSelect, matchesTagFilter } from '@/components/tags/TagFilterSelect';
import { useEntityTags } from '@/hooks/useEntityTags';
import { BulkTagMenu } from '@/components/tags/BulkTagMenu';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { useListSelection } from '@/hooks/useListSelection';
import { Checkbox } from '@/components/ui/checkbox';
import { getBrandColor } from '@/lib/conversationBrand';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'closed', label: 'Closed' },
];

export default function CustomersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const { getTags } = useEntityTags('customer');
  const { dateTime } = useDateFormatting();
  const { data: allCustomers = [], isLoading } = useCustomersList(search);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    allCustomers.forEach((c) => (c?.brands ?? []).forEach((b) => set.add(b)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allCustomers]);

  const customers = useMemo(
    () =>
      allCustomers.filter((c) => {
        if (statusFilter !== 'all' && !(c?.statuses ?? []).includes(statusFilter)) return false;
        if (brandFilter !== 'all' && !(c?.brands ?? []).includes(brandFilter)) return false;
        if (!matchesTagFilter(getTags(c?.id).map((t) => t.id), tagFilter)) return false;
        return true;
      }),
    [allCustomers, statusFilter, brandFilter, tagFilter, getTags],
  );

  const orderedIds = useMemo(() => customers.map((c) => c.id), [customers]);
  const selection = useListSelection(orderedIds);



  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-3 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <UserRound className="h-5 w-5 text-muted-foreground" />
                Customers
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Every person who has contacted support — open one to see their full interaction history.
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2 sm:flex sm:flex-row sm:items-center sm:gap-2 sm:space-y-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or phone"
                className="h-10 pl-9 text-base sm:h-9 sm:text-sm"
              />
            </div>
            <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 flex-1 sm:h-9 sm:w-[170px] sm:flex-none">
                <SelectValue placeholder="Inquiry status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label} inquiries
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-10 flex-1 sm:h-9 sm:w-[170px] sm:flex-none">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {brandOptions.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TagFilterSelect value={tagFilter} onChange={setTagFilter} className="h-10 sm:h-9" />
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-24 sm:p-6 sm:pb-6">

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No customers found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <SelectionToolbar
                count={selection.count}
                allSelected={selection.allSelected}
                onSelectAll={selection.selectAll}
                onClear={selection.clear}
              >
                <BulkTagMenu entityType="customer" entityIds={selection.ids} className="h-7 px-2 text-xs" />
              </SelectionToolbar>

              {customers.map((c) => (
                <ContextMenu key={c.id}>
                  <ContextMenuTrigger asChild>
                <div className="flex w-full items-center gap-2 rounded-lg border bg-card pl-3 transition-colors hover:bg-accent/50 active:bg-accent/60">
                  <Checkbox
                    checked={selection.isSelected(c.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                      selection.toggle(c.id, !selection.isSelected(c.id), (e as React.MouseEvent).shiftKey);
                    }}
                    aria-label="Select customer"
                  />
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-3 text-left sm:py-3 sm:pr-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {c.full_name || c.email || c.phone || 'Unknown customer'}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {c.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {c.phone}
                        </span>
                      )}
                      {(c.brands ?? []).map((b) => (
                        <Badge
                          key={b}
                          variant="outline"
                          className="h-5 px-1.5 text-[10px] font-normal"
                          style={{
                            borderColor: getBrandColor(b),
                            color: getBrandColor(b),
                          }}
                        >
                          {b}
                        </Badge>
                      ))}
                      <TagBadgeList tags={getTags(c.id)} compact />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                    {(c.statuses ?? []).includes('open') && (
                      <Badge className="text-[10px] sm:text-xs">Open</Badge>
                    )}
                    {!(c.statuses ?? []).includes('open') && (c.statuses ?? []).includes('pending') && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs">
                        Pending
                      </Badge>
                    )}
                    <Badge variant="secondary" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {c.conversation_count}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground sm:text-xs">
                      {c.last_activity_at ? dateTime(c.last_activity_at) : '—'}
                    </span>
                  </div>
                </button>
                </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-52">
                    <ContextMenuLabel className="text-xs text-muted-foreground">Tags</ContextMenuLabel>
                    <TagContextMenuItems entityType="customer" entityId={c.id} />
                  </ContextMenuContent>
                </ContextMenu>
              ))}
            </div>
          )}
        </div>

        {selectedCustomerId && (
          <CustomerDetailsSidebar
            key={selectedCustomerId}
            customerId={selectedCustomerId}
            onClose={() => setSelectedCustomerId(null)}
            className="hidden w-[380px] shrink-0 border-l lg:flex"
          />
        )}
        </div>

        <Sheet
          open={!!selectedCustomerId && !isDesktop}
          onOpenChange={(o) => !o && setSelectedCustomerId(null)}
        >
          <SheetContent side="right" className="w-full max-w-[420px] p-0 sm:max-w-[420px]">
            {selectedCustomerId && (
              <CustomerDetailsSidebar
                customerId={selectedCustomerId}
                onClose={() => setSelectedCustomerId(null)}
                className="h-full"
              />
            )}
          </SheetContent>
        </Sheet>
      </div>

    </UnifiedAppLayout>
  );
}
