import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  MessageSquare, Percent, GitCompare, Target,
  TrendingUp, TrendingDown, AlertTriangle, ThumbsDown, HelpCircle, Eye, X,
} from "lucide-react";
import { formatRelativeTime } from "@/utils/dateFormatting";
import { useToast } from "@/hooks/use-toast";

interface Props {
  organizationId: string;
}

// ── helpers ──────────────────────────────────────────────────────────
const sevenDaysAgo = () => new Date(Date.now() - 7 * 86400000).toISOString();
const fourteenDaysAgo = () => new Date(Date.now() - 14 * 86400000).toISOString();
const thirtyDaysAgo = () => new Date(Date.now() - 30 * 86400000).toISOString();

function trendPercent(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function TrendArrow({ value }: { value: number }) {
  if (value === 0) return null;
  return value > 0 ? (
    <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
      <TrendingUp className="w-3 h-3" /> +{value}%
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
      <TrendingDown className="w-3 h-3" /> {value}%
    </span>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  tone: "hsl(var(--primary))",
  factual: "hsl(210 80% 55%)",
  policy: "hsl(35 90% 55%)",
  completeness: "hsl(150 60% 45%)",
  format: "hsl(280 60% 55%)",
};

const REASON_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  quality_flag: { label: "Quality Flag", icon: AlertTriangle, color: "bg-yellow-100 text-yellow-800" },
  low_eval_score: { label: "Low Score", icon: TrendingDown, color: "bg-orange-100 text-orange-800" },
  negative_feedback: { label: "Negative Feedback", icon: ThumbsDown, color: "bg-red-100 text-red-800" },
  knowledge_gap: { label: "Knowledge Gap", icon: HelpCircle, color: "bg-blue-100 text-blue-800" },
};

function priorityBadge(p: number | null) {
  if (p === 1) return <Badge variant="destructive">Critical</Badge>;
  if (p === 2) return <Badge className="bg-orange-500 text-white hover:bg-orange-600">High</Badge>;
  if (p === 3) return <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">Medium</Badge>;
  return <Badge variant="secondary">Low</Badge>;
}

// ── component ────────────────────────────────────────────────────────
export function LearningDashboard({ organizationId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  // ── Section 1: stat cards ──────────────────────────────────────────
  const { data: feedbackStats } = useQuery({
    queryKey: ["learning-feedback-stats", organizationId],
    staleTime: 60_000,
    queryFn: async () => {
      const now7 = sevenDaysAgo();
      const now14 = fourteenDaysAgo();

      // total feedback by source (last 7 + prev 7)
      const [{ data: cur }, { data: prev }] = await Promise.all([
        supabase.from("widget_ai_feedback").select("source").eq("organization_id", organizationId).gte("created_at", now7),
        supabase.from("widget_ai_feedback").select("source").eq("organization_id", organizationId).gte("created_at", now14).lt("created_at", now7),
      ]);

      const bySource: Record<string, number> = {};
      (cur ?? []).forEach((r) => { bySource[r.source ?? "unknown"] = (bySource[r.source ?? "unknown"] || 0) + 1; });

      // assistant message counts for rate
      const msgCurQ = supabase.from("widget_ai_messages").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("role", "assistant") as any;
      const msgPrevQ = supabase.from("widget_ai_messages").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).eq("role", "assistant") as any;
      const [{ count: msgCur }, { count: msgPrev }] = await Promise.all([
        msgCurQ.gte("created_at", now7),
        msgPrevQ.gte("created_at", now14).lt("created_at", now7),
      ]);

      const totalCur = (cur ?? []).length;
      const totalPrev = (prev ?? []).length;
      const rateCur = (msgCur ?? 0) > 0 ? (totalCur / (msgCur ?? 1)) * 100 : 0;
      const ratePrev = (msgPrev ?? 0) > 0 ? (totalPrev / (msgPrev ?? 1)) * 100 : 0;

      // preference pairs
      const [{ count: ppCur }, { count: ppPrev }] = await Promise.all([
        supabase.from("preference_pairs").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", now7),
        supabase.from("preference_pairs").select("*", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", now14).lt("created_at", now7),
      ]);

      // avg eval score
      const [{ data: evalCur }, { data: evalPrev }] = await Promise.all([
        supabase.from("conversation_evaluations").select("composite_score").eq("organization_id", organizationId).gte("created_at", now7),
        supabase.from("conversation_evaluations").select("composite_score").eq("organization_id", organizationId).gte("created_at", now14).lt("created_at", now7),
      ]);
      const avgCur = (evalCur ?? []).length > 0 ? (evalCur ?? []).reduce((s, r) => s + (r.composite_score ?? 0), 0) / (evalCur ?? []).length : 0;
      const avgPrev = (evalPrev ?? []).length > 0 ? (evalPrev ?? []).reduce((s, r) => s + (r.composite_score ?? 0), 0) / (evalPrev ?? []).length : 0;

      return {
        totalFeedback: totalCur,
        feedbackTrend: trendPercent(totalCur, totalPrev),
        bySource,
        feedbackRate: rateCur,
        rateTrend: trendPercent(rateCur, ratePrev),
        prefPairs: ppCur ?? 0,
        ppTrend: trendPercent(ppCur ?? 0, ppPrev ?? 0),
        avgEval: avgCur,
        evalTrend: trendPercent(avgCur, avgPrev),
      };
    },
  });

  // ── Section 2: edit category distribution ──────────────────────────
  const { data: categoryData } = useQuery({
    queryKey: ["learning-edit-categories", organizationId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("preference_pairs")
        .select("edit_category")
        .eq("organization_id", organizationId)
        .not("edit_category", "is", null);

      const counts: Record<string, number> = {};
      (data ?? []).forEach((r) => {
        const cat = r.edit_category ?? "unknown";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // ── Section 3: eval score trend ────────────────────────────────────
  const { data: evalTrend } = useQuery({
    queryKey: ["learning-eval-trend", organizationId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("conversation_evaluations")
        .select("created_at, composite_score")
        .eq("organization_id", organizationId)
        .gte("created_at", thirtyDaysAgo())
        .order("created_at", { ascending: true });

      const byDate: Record<string, { sum: number; count: number }> = {};
      (data ?? []).forEach((r) => {
        const d = r.created_at?.split("T")[0] ?? "";
        if (!byDate[d]) byDate[d] = { sum: 0, count: 0 };
        byDate[d].sum += (r.composite_score ?? 0) * 100;
        byDate[d].count += 1;
      });
      return Object.entries(byDate)
        .map(([date, v]) => ({ date, score: Math.round(v.sum / v.count) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });

  // ── Section 4: review queue ────────────────────────────────────────
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  const { data: reviewItems, isLoading: reviewLoading } = useQuery({
    queryKey: ["learning-review-queue", organizationId, statusFilter],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("review-queue", {
        body: { action: "list", organizationId, status: statusFilter },
      });
      return (data?.items ?? data ?? []) as Array<{
        id: string;
        conversation_id: string;
        priority: number | null;
        reason: string;
        details: string | null;
        created_at: string | null;
        status: string | null;
      }>;
    },
  });

  const filteredReview = useMemo(() => {
    if (!reviewItems) return [];
    const items = reasonFilter === "all" ? reviewItems : reviewItems.filter((r) => r.reason === reasonFilter);
    return items.sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));
  }, [reviewItems, reasonFilter]);

  const updateReview = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.functions.invoke("review-queue", {
        body: { action: "update", id, status },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["learning-review-queue"] });
      toast({ title: "Review queue updated" });
    },
  });

  // ── chart configs ──────────────────────────────────────────────────
  const barConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: string }> = {};
    (categoryData ?? []).forEach((c) => {
      cfg[c.name] = { label: c.name, color: CATEGORY_COLORS[c.name] ?? "hsl(var(--muted-foreground))" };
    });
    return cfg;
  }, [categoryData]);

  const lineConfig = { score: { label: "Quality Score", color: "hsl(210 80% 55%)" } };

  // ── stats shorthand ────────────────────────────────────────────────
  const s = feedbackStats;

  return (
    <div className="space-y-6">
      {/* Section 1 — Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s?.totalFeedback ?? 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <TrendArrow value={s?.feedbackTrend ?? 0} />
            </div>
            {s?.bySource && Object.keys(s.bySource).length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {Object.entries(s.bySource).map(([k, v]) => `${k}: ${v}`).join(" · ")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feedback Rate</CardTitle>
            <Percent className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(s?.feedbackRate ?? 0).toFixed(1)}%</div>
            <div className="flex items-center gap-2 mt-1">
              <TrendArrow value={s?.rateTrend ?? 0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Preference Pairs</CardTitle>
            <GitCompare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{s?.prefPairs ?? 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <TrendArrow value={s?.ppTrend ?? 0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Eval Score</CardTitle>
            <Target className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{((s?.avgEval ?? 0) * 100).toFixed(0)}%</div>
            <div className="flex items-center gap-2 mt-1">
              <TrendArrow value={s?.evalTrend ?? 0} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2 + 3 — Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Edit Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What agents correct most</CardTitle>
          </CardHeader>
          <CardContent>
            {(categoryData ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No preference pairs recorded yet</p>
            ) : (
              <ChartContainer config={barConfig} className="h-[260px] w-full">
                <BarChart data={categoryData} layout="vertical" margin={{ left: 80, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={72} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Score Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI Quality Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {(evalTrend ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No evaluation data yet</p>
            ) : (
              <ChartContainer config={lineConfig} className="h-[260px] w-full">
                <LineChart data={evalTrend} margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <ReferenceLine y={50} stroke="hsl(var(--destructive))" strokeDasharray="6 4" label={{ value: "50%", position: "insideTopLeft", fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="score" stroke="hsl(210 80% 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 4 — Review Queue */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Review Queue</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={reasonFilter} onValueChange={setReasonFilter}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reasons</SelectItem>
                  <SelectItem value="quality_flag">Quality Flag</SelectItem>
                  <SelectItem value="low_eval_score">Low Score</SelectItem>
                  <SelectItem value="negative_feedback">Negative Feedback</SelectItem>
                  <SelectItem value="knowledge_gap">Knowledge Gap</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {reviewLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : filteredReview.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No items in queue</p>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Priority</TableHead>
                    <TableHead className="w-[160px]">Reason</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReview.map((item) => {
                    const rc = REASON_CONFIG[item.reason] ?? { label: item.reason, icon: HelpCircle, color: "bg-muted text-muted-foreground" };
                    const Icon = rc.icon;
                    const details = item.details ?? "";
                    const truncated = details.length > 100 ? details.slice(0, 100) + "…" : details;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>{priorityBadge(item.priority)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${rc.color}`}>
                            <Icon className="w-3 h-3" /> {rc.label}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {details.length > 100 ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default">{truncated}</span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap text-xs">
                                {details}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span>{details || "—"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.created_at ? formatRelativeTime(new Date(item.created_at)) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={updateReview.isPending}
                              onClick={() => {
                                updateReview.mutate({ id: item.id, status: "reviewed" });
                                window.open(`/ai-analytics?conversation=${item.conversation_id}`, "_blank");
                              }}
                            >
                              <Eye className="w-3 h-3 mr-1" /> Review
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              disabled={updateReview.isPending}
                              onClick={() => updateReview.mutate({ id: item.id, status: "dismissed" })}
                            >
                              <X className="w-3 h-3 mr-1" /> Dismiss
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
