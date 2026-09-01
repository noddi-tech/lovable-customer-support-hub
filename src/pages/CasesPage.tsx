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
import { CaseStatusBadge, CasePriorityBadge, CaseSlaBadge, CASE_PRIORITY_DOT } from '@/components/cases/CaseBadges';
import { CreateCaseDialog } from '@/components/cases/CreateCaseDialog';
import { CaseContextMenu } from '@/components/cases/CaseContextMenu';
import { TagFilterSelect, matchesTagFilter } from '@/components/tags/TagFilterSelect';
import { TagBadgeList } from '@/components/tags/TagBadge';
import { useEntityTags } from '@/hooks/useEntityTags';
import { BulkTagMenu } from '@/components/tags/BulkTagMenu';
import { BulkAssignMenu } from '@/components/shared/BulkAssignMenu';
import { SelectionToolbar } from '@/components/shared/SelectionToolbar';
import { useListSelection } from '@/hooks/useListSelection';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

import {
  CASE_PRIORITY_LABELS,
  useCaseCategories,
  useCases,
  useCaseQueueCounts,

  type CasePriority,
  type CaseQueueView,
} from '@/hooks/useCases';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart3,
  Plus,
  Search,
  Briefcase,
  UserRound,
  HelpCircle,
  AlertTriangle,
  UserX,
  Hourglass,
  CircleDot,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';


const VIEWS: Array<{ value: CaseQueueView; label: string; icon: LucideIcon }> = [
  { value: 'mine', label: 'My cases', icon: UserRound },
  { value: 'overdue', label: 'Overdue', icon: AlertTriangle },
  { value: 'unassigned', label: 'Unassigned', icon: UserX },
  { value: 'waiting', label: 'Waiting', icon: Hourglass },
  { value: 'open', label: 'All open', icon: CircleDot },
  { value: 'closed', label: 'Resolved', icon: CheckCircle2 },
];


export default function CasesPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<CaseQueueView>('mine');
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const { getTags: getCaseTags } = useEntityTags('case');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const { dateTime } = useDateFormatting();
  const { data: categories = [] } = useCaseCategories();
  const { data: queueCounts } = useCaseQueueCounts();


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
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-lg font-semibold">Cases</h1>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="How cases are created"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <HelpCircle className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-sm space-y-2 p-3 text-xs">
                      <p className="font-medium text-sm">How cases get created</p>
                      <p>
                        You rarely need the <span className="font-medium">New case</span> button — cases open
                        themselves so nothing slips through.
                      </p>
                      <ul className="list-disc space-y-1 pl-4">
                        <li>
                          <span className="font-medium">Emails</span> open a case as soon as they arrive.
                        </li>
                        <li>
                          <span className="font-medium">Chats</span> open one the moment a colleague takes the
                          chat — chats the AI handles alone stay out of the queue.
                        </li>
                        <li>
                          <span className="font-medium">Noise is skipped</span>: out-of-office replies,
                          auto-replies, bounces and spam never create a case.
                        </li>
                      </ul>
                      <p className="font-medium text-sm pt-1">One case per customer issue</p>
                      <ul className="list-disc space-y-1 pl-4">
                        <li>
                          A new message from someone who already has an active case is added to that case
                          instead of starting a new one.
                        </li>
                        <li>
                          If their case was closed in the last 7 days, it re-opens rather than duplicating.
                        </li>
                        <li>
                          When the last conversation on a case is closed, the case closes automatically — and
                          re-opens if the customer writes back.
                        </li>
                      </ul>
                      <p className="pt-1 text-muted-foreground">
                        Phone, SMS and social threads stay manual — use New case for those.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Every case has one owner and a due date. Cases persist across emails, chats and calls for the
                same customer.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/operations/case-reports')}>
              <BarChart3 className="mr-1.5 h-4 w-4" /> Reports
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> New case
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            <Tabs value={view} onValueChange={(v) => setView(v as CaseQueueView)}>
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                {VIEWS.map((v) => (
                  <TabsTrigger key={v.value} value={v.value} className="gap-1.5 text-xs">
                    <v.icon className="h-3.5 w-3.5" />
                    {v.label}
                    <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-muted px-1 text-[10px] text-foreground/70">
                      {queueCounts?.[v.value] ?? 0}
                    </span>
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
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`h-2 w-2 rounded-full ${CASE_PRIORITY_DOT[value as CasePriority]}`}
                        />
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <TagFilterSelect value={tagFilter} onChange={setTagFilter} />
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
              {cases
                .filter((c) => matchesTagFilter(getCaseTags(c.id).map((t) => t.id), tagFilter))
                .map((c) => (
                <CaseContextMenu
                  key={c.id}
                  caseId={c.id}
                  status={c.status}
                  priority={c.priority}
                  ownerId={c.owner_id}
                >
                  <button
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
                      <TagBadgeList tags={getCaseTags(c.id)} compact max={3} />
                    </div>
                  </button>
                </CaseContextMenu>
              ))}

            </div>
          )}
        </div>
      </div>

      <CreateCaseDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={(id) => navigate(`/operations/cases/${id}`)} />
    </UnifiedAppLayout>
  );
}
