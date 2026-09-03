import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { UnifiedAppLayout } from "@/components/layout/UnifiedAppLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { CASE_STATUS_LABELS, type CaseStatus, getCaseSlaState, useCases } from "@/hooks/useCases"
import { supabase } from "@/integrations/supabase/client"
import { useNavigate } from "@/router/compat"

const sel = (s: string): string => s

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  )
}

function BreakdownList({ rows }: { rows: Array<{ label: string; count: number }> }) {
  const total = rows.reduce((acc, r) => acc + r.count, 0) || 1
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>
  return (
    <div className="space-y-2">
      {rows
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((r) => (
          <div key={r.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="truncate">{r.label}</span>
              <span className="text-muted-foreground">{r.count}</span>
            </div>
            <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-primary"
                style={{ width: `${Math.round((r.count / total) * 100)}%` }}
              />
            </div>
          </div>
        ))}
    </div>
  )
}

function TaxonomyEditor({
  table,
  title,
}: {
  table: "case_categories" | "case_resolution_codes"
  title: string
}) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")

  const { data: rows = [] } = useQuery({
    queryKey: ["taxonomy", table, profile?.organization_id],
    enabled: !!profile?.organization_id,
    queryFn: async () => {
      const { data, error } = await (supabase.from(table) as any)
        .select(sel("id, name, slug, is_active, sort_order"))
        .order("sort_order")
      if (error) throw error
      return (data ?? []) as Array<{
        id: string
        name: string
        slug: string
        is_active: boolean
        sort_order: number
      }>
    },
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["taxonomy", table] })

  const add = async () => {
    if (!name.trim() || !profile?.organization_id) return
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const { error } = await (supabase.from(table) as any).insert({
      organization_id: profile.organization_id,
      name: name.trim(),
      slug,
      sort_order: rows.length + 1,
    })
    if (error) {
      toast.error(error.message)
      return
    }
    setName("")
    refresh()
    queryClient.invalidateQueries({ queryKey: ["case-categories"] })
    queryClient.invalidateQueries({ queryKey: ["case-resolution-codes"] })
    toast.success(`${title} added`)
  }

  const toggle = async (id: string, isActive: boolean) => {
    const { error } = await (supabase.from(table) as any)
      .update({ is_active: !isActive })
      .eq("id", id)
    if (error) {
      toast.error(error.message)
      return
    }
    refresh()
    queryClient.invalidateQueries({ queryKey: ["case-categories"] })
    queryClient.invalidateQueries({ queryKey: ["case-resolution-codes"] })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Add ${title.toLowerCase()}`}
            className="h-9 text-base sm:text-sm"
          />
          <Button size="sm" onClick={add} disabled={!name.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-2 text-sm">
              <span className={r.is_active ? "" : "text-muted-foreground line-through"}>
                {r.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 text-xs"
                onClick={() => toggle(r.id, r.is_active)}
              >
                {r.is_active ? "Disable" : "Enable"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default function CaseReportsPage() {
  const navigate = useNavigate()
  const { data: cases = [], isLoading } = useCases({ view: "all" })

  const stats = useMemo(() => {
    const open = cases.filter((c) => c.status !== "resolved" && c.status !== "closed")
    const closed = cases.filter((c) => c.status === "resolved" || c.status === "closed")
    const breached = open.filter((c) => getCaseSlaState(c) === "breached")
    const unassigned = open.filter((c) => !c.owner_id)

    const withResolution = closed.filter((c) => c.resolved_at)
    const avgResolutionHours =
      withResolution.length > 0
        ? withResolution.reduce(
            (acc, c) =>
              acc +
              (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) / 3600000,
            0,
          ) / withResolution.length
        : null

    const byKey = (items: typeof cases, keyFn: (c: (typeof cases)[number]) => string) => {
      const map = new Map<string, number>()
      items.forEach((c) => {
        const k = keyFn(c)
        map.set(k, (map.get(k) ?? 0) + 1)
      })
      return Array.from(map.entries()).map(([label, count]) => ({ label, count }))
    }

    return {
      open,
      closed,
      breached,
      unassigned,
      avgResolutionHours,
      byCategory: byKey(cases, (c) => c.category?.name ?? "Uncategorised"),
      byResolution: byKey(closed, (c) => c.resolution_code?.name ?? "No code"),
      byOwner: byKey(open, (c) => c.owner?.full_name ?? "Unassigned"),
      byStatus: byKey(cases, (c) => CASE_STATUS_LABELS[c.status] ?? c.status),
    }
  }, [cases])

  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <Button variant="ghost" size="sm" onClick={() => navigate("/operations/cases")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Case reporting</h1>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Tabs defaultValue="overview">
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="taxonomy">Taxonomy</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Open cases" value={stats.open.length} />
                  <Metric
                    label="Overdue"
                    value={stats.breached.length}
                    hint={
                      stats.breached.length > 0 ? "Needs immediate follow-up" : "All within SLA"
                    }
                  />
                  <Metric label="Unassigned" value={stats.unassigned.length} />
                  <Metric
                    label="Avg. resolution"
                    value={
                      stats.avgResolutionHours === null
                        ? "—"
                        : `${stats.avgResolutionHours.toFixed(1)} h`
                    }
                    hint={`${stats.closed.length} resolved`}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Why customers contact us</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BreakdownList rows={stats.byCategory} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">How cases end</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BreakdownList rows={stats.byResolution} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Open workload per owner</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BreakdownList rows={stats.byOwner} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Status mix</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BreakdownList rows={stats.byStatus} />
                    </CardContent>
                  </Card>
                </div>

                <p className="text-xs text-muted-foreground">
                  <Badge variant="outline" className="mr-1.5">
                    Note
                  </Badge>
                  Based on the most recent 500 cases.
                </p>
              </TabsContent>

              <TabsContent value="taxonomy" className="mt-4 grid gap-4 lg:grid-cols-2">
                <TaxonomyEditor table="case_categories" title="Categories" />
                <TaxonomyEditor table="case_resolution_codes" title="Resolution codes" />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </UnifiedAppLayout>
  )
}
