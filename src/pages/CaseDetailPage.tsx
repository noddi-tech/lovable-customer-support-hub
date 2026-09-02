import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  MessageSquare,
  Phone,
  UserRound,
  Wrench,
} from "lucide-react"
import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  CASE_PRIORITY_DOT,
  CASE_STATUS_ICON_COLORS,
  CASE_STATUS_ICONS,
  CasePriorityBadge,
  CaseSlaBadge,
  CaseStatusBadge,
} from "@/components/cases/CaseBadges"
import { CaseTimeline } from "@/components/cases/CaseTimeline"
import { CloseCaseDialog } from "@/components/cases/CloseCaseDialog"
import { CustomerDetailsSidebar } from "@/components/customers/CustomerDetailsSidebar"
import { UnifiedAppLayout } from "@/components/layout/UnifiedAppLayout"
import { CreateNoddiTicketDialog } from "@/components/noddi-tickets/CreateNoddiTicketDialog"
import { EntityTagPicker } from "@/components/tags/TagPicker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/hooks/useAuth"
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  type CasePriority,
  type CaseStatus,
  useCase,
  useCaseActivity,
  useCaseCategories,
  useUpdateCase,
} from "@/hooks/useCases"
import { useDateFormatting } from "@/hooks/useDateFormatting"
import { supabase } from "@/integrations/supabase/client"

function useOrgAgents() {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ["org-agents", profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("profiles") as any)
        .select("id, full_name, email")
        .eq("organization_id", profile!.organization_id)
        .order("full_name")
      if (error) throw error
      return (data ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>
    },
  })
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: record, isLoading } = useCase(id)
  const { data: activity = [] } = useCaseActivity(id)
  const { data: categories = [] } = useCaseCategories()
  const { data: agents = [] } = useOrgAgents()
  const updateCase = useUpdateCase()
  const { dateTime } = useDateFormatting()
  const [closeOpen, setCloseOpen] = useState(false)
  const [customerPanelId, setCustomerPanelId] = useState<string | null>(null)
  const [opsTicketOpen, setOpsTicketOpen] = useState(false)

  if (isLoading) {
    return (
      <UnifiedAppLayout>
        <div className="space-y-3 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      </UnifiedAppLayout>
    )
  }

  if (!record) {
    return (
      <UnifiedAppLayout>
        <div className="p-6">
          <p className="text-sm text-muted-foreground">Case not found.</p>
          <Button variant="outline" className="mt-3" onClick={() => navigate("/operations/cases")}>
            Back to cases
          </Button>
        </div>
      </UnifiedAppLayout>
    )
  }

  const set = (updates: Record<string, unknown>) => updateCase.mutate({ id: record.id, updates })
  const isClosed = record.status === "resolved" || record.status === "closed"

  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <Button variant="ghost" size="sm" onClick={() => navigate("/operations/cases")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="font-mono text-xs text-muted-foreground">#{record.case_number}</span>
            <h1 className="min-w-0 flex-1 truncate text-base font-semibold">{record.title}</h1>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpsTicketOpen(true)}
              title="Create an operations ticket in Navio for this case"
            >
              <Wrench className="mr-1.5 h-4 w-4" /> Ops ticket
            </Button>
            {!isClosed && (
              <Button size="sm" onClick={() => setCloseOpen(true)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Resolve
              </Button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <CaseStatusBadge status={record.status} />
            <CasePriorityBadge priority={record.priority} />
            <CaseSlaBadge record={record} />
            <EntityTagPicker entityType="case" entityId={record.id} />
            <span className="text-xs text-muted-foreground">
              Created {dateTime(record.created_at)}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {record.description && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Description</CardTitle>
                  </CardHeader>
                  <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {record.description}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Linked activity ({activity.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nothing linked yet. Link a conversation, chat or call from its side panel.
                    </p>
                  ) : (
                    activity.map((item) => {
                      const Icon =
                        item.kind === "call" ? Phone : item.kind === "chat" ? MessageSquare : Mail
                      return (
                        <button
                          key={item.id}
                          disabled={!item.href}
                          onClick={() => item.href && navigate(item.href)}
                          className="w-full rounded-md border p-2.5 text-left transition-colors enabled:hover:bg-accent/50 disabled:cursor-default"
                        >
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {item.title}
                            </span>
                            {item.status && (
                              <span className="text-xs text-muted-foreground">
                                {item.status.replace(/_/g, " ")}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                              {item.subtitle}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">{dateTime(item.at)}</p>
                        </button>
                      )
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">History</CardTitle>
                </CardHeader>
                <CardContent>
                  <CaseTimeline caseId={record.id} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Case details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={record.status}
                      onValueChange={(v) => set({ status: v as CaseStatus })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CASE_STATUS_LABELS).map(([value, label]) => {
                          const Icon = CASE_STATUS_ICONS[value as CaseStatus]
                          return (
                            <SelectItem key={value} value={value}>
                              <span className="flex items-center gap-2">
                                <Icon
                                  className={`h-4 w-4 ${CASE_STATUS_ICON_COLORS[value as CaseStatus]}`}
                                />
                                {label}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Owner</Label>
                    <Select
                      value={record.owner_id ?? "unassigned"}
                      onValueChange={(v) => set({ owner_id: v === "unassigned" ? null : v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {agents.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.full_name || a.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Priority</Label>
                    <Select
                      value={record.priority}
                      onValueChange={(v) => set({ priority: v as CasePriority })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
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
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={record.category_id ?? "none"}
                      onValueChange={(v) => set({ category_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Uncategorised</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {record.customer && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Customer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() => setCustomerPanelId(record.customer!.id)}
                      onDoubleClick={() => navigate(`/customers/${record.customer!.id}`)}
                      className="flex w-full items-center gap-2 rounded-md border p-2.5 text-left hover:bg-accent/50"
                    >
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {record.customer.full_name || record.customer.email}
                        </p>
                        {record.customer.email && (
                          <p className="truncate text-xs text-muted-foreground">
                            {record.customer.email}
                          </p>
                        )}
                      </div>
                    </button>
                  </CardContent>
                </Card>
              )}

              {isClosed && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resolution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="font-medium">{record.resolution_code?.name ?? "No code"}</p>
                    {record.resolution_notes && (
                      <p className="text-muted-foreground">{record.resolution_notes}</p>
                    )}
                    {record.resolved_at && (
                      <p className="text-xs text-muted-foreground">
                        Resolved {dateTime(record.resolved_at)}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <CloseCaseDialog open={closeOpen} onOpenChange={setCloseOpen} record={record} />

      <CreateNoddiTicketDialog
        open={opsTicketOpen}
        onOpenChange={setOpsTicketOpen}
        defaultTitle={record.title}
        defaultDescription={[
          `Created from case #${record.case_number} in the Support Hub.`,
          record.description ? `\n${record.description}` : null,
          `\nCase: ${window.location.origin}/operations/cases/${record.id}`,
        ]
          .filter(Boolean)
          .join("\n")}
        defaultPriority={
          record.priority === "urgent" || record.priority === "high" ? "HIGH" : "NORMAL"
        }
        onCreated={() => toast.success("Operations ticket created in Navio")}
      />

      <Sheet open={!!customerPanelId} onOpenChange={(o) => !o && setCustomerPanelId(null)}>
        <SheetContent side="right" className="w-full max-w-[420px] p-0 sm:max-w-[420px]">
          {customerPanelId && (
            <CustomerDetailsSidebar
              key={customerPanelId}
              customerId={customerPanelId}
              onClose={() => setCustomerPanelId(null)}
              className="h-full"
            />
          )}
        </SheetContent>
      </Sheet>
    </UnifiedAppLayout>
  )
}
