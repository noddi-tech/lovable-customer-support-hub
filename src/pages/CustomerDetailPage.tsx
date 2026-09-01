import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EntityTagPicker } from '@/components/tags/TagPicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CaseStatusBadge, CasePriorityBadge } from '@/components/cases/CaseBadges';
import { CreateCaseDialog } from '@/components/cases/CreateCaseDialog';
import { useCases } from '@/hooks/useCases';
import {
  useCustomer,
  useCustomerCalls,
  useCustomerConversations,
  useCustomerIdentities,
  useCustomerNoteMutations,
  useCustomerNotes,
  useCustomerSummary,
} from '@/hooks/useCustomerRecord';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  Pin,
  PinOff,
  Plus,
  Trash2,
  UserRound,
} from 'lucide-react';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dateTime } = useDateFormatting();
  const { data: customer, isLoading } = useCustomer(id);
  const { data: identities = [] } = useCustomerIdentities(id);
  const { data: conversations = [] } = useCustomerConversations(id);
  const { data: calls = [] } = useCustomerCalls(id);
  const { data: cases = [] } = useCases({ view: 'all', customerId: id });
  const { data: notes = [] } = useCustomerNotes(id);
  const { data: summary } = useCustomerSummary(customer?.email ?? null);
  const { addNote, updateNote, deleteNote } = useCustomerNoteMutations(id);
  const [noteDraft, setNoteDraft] = useState('');
  const [createCaseOpen, setCreateCaseOpen] = useState(false);

  if (isLoading) {
    return (
      <UnifiedAppLayout>
        <div className="space-y-3 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </UnifiedAppLayout>
    );
  }

  if (!customer) {
    return (
      <UnifiedAppLayout>
        <div className="p-6 text-sm text-muted-foreground">Customer not found.</div>
      </UnifiedAppLayout>
    );
  }

  const openCases = cases.filter((c) => c.status !== 'resolved' && c.status !== 'closed');

  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-3 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <UserRound className="h-4 w-4 text-muted-foreground" />
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
              {customer.full_name || customer.email || 'Customer'}
            </h1>
            <Button size="sm" className="h-9 shrink-0 px-2.5 sm:px-3" onClick={() => setCreateCaseOpen(true)}>
              <Plus className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">New case</span>
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {customer.email && <span>{customer.email}</span>}
            {customer.phone && <span>{customer.phone}</span>}
            <Badge variant="outline">{conversations.length} conversations</Badge>
            <Badge variant="outline">{openCases.length} open cases</Badge>
            <EntityTagPicker entityType="customer" entityId={customer.id} />
            <span>Customer since {dateTime(customer.created_at, false)}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-3 pb-24 sm:p-6 sm:pb-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Tabs defaultValue="timeline">
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                <TabsList className="flex h-auto w-max justify-start gap-1">
                  <TabsTrigger value="timeline" className="shrink-0">Timeline</TabsTrigger>
                  <TabsTrigger value="cases" className="shrink-0">Cases ({cases.length})</TabsTrigger>
                  <TabsTrigger value="calls" className="shrink-0">Calls ({calls.length})</TabsTrigger>
                </TabsList>
                </div>

                <TabsContent value="timeline" className="mt-3 space-y-2">
                  {conversations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  ) : (
                    conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/c/${c.id}`)}
                        className="w-full rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/50 active:bg-accent/60 sm:p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          {c.channel === 'email' ? (
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {c.subject || '(no subject)'}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.status}
                          </Badge>
                        </div>
                        {c.preview_text && (
                          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{c.preview_text}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">{dateTime(c.updated_at)}</p>
                      </button>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="cases" className="mt-3 space-y-2">
                  {cases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No cases for this customer.</p>
                  ) : (
                    cases.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => navigate(`/operations/cases/${c.id}`)}
                        className="w-full rounded-md border bg-card p-3 text-left transition-colors hover:bg-accent/50 active:bg-accent/60 sm:p-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">#{c.case_number}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title}</span>
                          <CaseStatusBadge status={c.status} />
                          <CasePriorityBadge priority={c.priority} />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Owner: {c.owner?.full_name ?? 'Unassigned'} · Updated {dateTime(c.updated_at)}
                        </p>
                      </button>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="calls" className="mt-3 space-y-2">
                  {calls.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No calls recorded.</p>
                  ) : (
                    calls.map((c) => (
                      <div key={c.id} className="rounded-md border bg-card p-2.5">
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="capitalize">{c.direction ?? 'call'}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {c.status ?? 'unknown'}
                          </Badge>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {c.started_at ? dateTime(c.started_at) : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-4">
              {summary?.summary_text && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">AI summary</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{summary.summary_text}</CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Add a note that stays with this customer"
                      className="text-base sm:text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!noteDraft.trim() || addNote.isPending}
                      onClick={() =>
                        addNote.mutate(
                          { content: noteDraft.trim() },
                          { onSuccess: () => setNoteDraft('') },
                        )
                      }
                    >
                      Add note
                    </Button>
                  </div>

                  {notes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <div key={n.id} className="rounded-md border bg-muted/30 p-2.5">
                          <p className="whitespace-pre-wrap text-sm">{n.content}</p>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{n.author?.full_name ?? 'Unknown'}</span>
                            <span>·</span>
                            <span>{dateTime(n.created_at)}</span>
                            {n.source === 'noddi' && (
                              <Badge variant="outline" className="h-4 px-1 text-[9px]">Noddi</Badge>
                            )}
                            <div className="ml-auto flex gap-1">
                              {n.source !== 'noddi' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => updateNote.mutate({ id: n.id, isPinned: !n.is_pinned })}
                                >
                                  {n.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => deleteNote.mutate(n.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Identities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {identities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No linked identities.</p>
                  ) : (
                    identities.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {i.identity_type.replace('_', ' ')}
                        </Badge>
                        <span className="min-w-0 truncate">{i.value}</span>
                        {i.is_primary && <Badge className="ml-auto text-[10px]">Primary</Badge>}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <CreateCaseDialog
        open={createCaseOpen}
        onOpenChange={setCreateCaseOpen}
        customerId={id}
        onCreated={(caseId) => navigate(`/operations/cases/${caseId}`)}
      />
    </UnifiedAppLayout>
  );
}
