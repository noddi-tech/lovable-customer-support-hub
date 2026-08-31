import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CaseStatusBadge, CasePriorityBadge, CaseSlaBadge } from '@/components/cases/CaseBadges';
import { CreateCaseDialog } from '@/components/cases/CreateCaseDialog';
import {
  CASE_PRIORITY_LABELS,
  useCaseCategories,
  useCases,
  type CasePriority,
  type CaseQueueView,
} from '@/hooks/useCases';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { Plus, Search, Briefcase, UserRound } from 'lucide-react';

const VIEWS: Array<{ value: CaseQueueView; label: string }> = [
  { value: 'mine', label: 'My cases' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'open', label: 'All open' },
  { value: 'closed', label: 'Resolved' },
];

export default function CasesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<CaseQueueView>('mine');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const { dateTime } = useDateFormatting();
  const { data: categories = [] } = useCaseCategories();

  const filters = useMemo(
    () => ({
      view,
      search: search.trim() || undefined,
      categoryId: categoryId === 'all' ? undefined : categoryId,
      priority: priority === 'all' ? undefined : (priority as CasePriority),
    }),
    [view, search, categoryId, priority],
  );

  const { data: cases = [], isLoading } = useCases(filters);

  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold">Cases</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Every case has one owner and a due date. Cases persist across emails, chats and calls for the
                same customer.
              </p>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New case
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            <Tabs value={view} onValueChange={(v) => setView(v as CaseQueueView)}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                {VIEWS.map((v) => (
                  <TabsTrigger key={v.value} value={v.value} className="text-xs">
                    {v.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cases"
                  className="h-9 pl-8 text-base sm:text-sm"
                />
              </div>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {Object.entries(CASE_PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Briefcase className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No cases in this queue</p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Create a case from a conversation to track follow-up work that spans more than a single
                  message thread.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/operations/cases/${c.id}`)}
                  className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{c.case_number}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
                    <CaseStatusBadge status={c.status} />
                    <CasePriorityBadge priority={c.priority} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {c.customer && (
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="h-3 w-3" />
                        {c.customer.full_name || c.customer.email || 'Unknown customer'}
                      </span>
                    )}
                    <span>Owner: {c.owner?.full_name ?? 'Unassigned'}</span>
                    {c.category && <span>{c.category.name}</span>}
                    <span>Updated {dateTime(c.updated_at)}</span>
                    <CaseSlaBadge record={c} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/operations/cases/${id}`)} />
    </UnifiedAppLayout>
  );
}
