import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ReferenceLine, Cell } from "recharts";
import { Shield, Layers, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatRelativeTime } from "@/hooks/timezone";

interface AutonomyDashboardProps {
  organizationId: string;
}

const LEVEL_NAMES: Record<number, string> = {
  0: "Suggest",
  1: "Draft & Queue",
  2: "Auto-Send",
  3: "Full Auto",
};

const LEVEL_COLORS: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  2: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  3: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

function formatCategory(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getBucketColor(bucket: number): string {
  if (bucket < 0.4) return "hsl(0, 70%, 55%)";
  if (bucket < 0.6) return "hsl(35, 85%, 55%)";
  if (bucket < 0.75) return "hsl(210, 70%, 55%)";
  return "hsl(140, 60%, 45%)";
}

export function AutonomyDashboard({ organizationId }: AutonomyDashboardProps) {
  const queryClient = useQueryClient();

  // Section 1: System status
  const { data: topicLevels = [] } = useQuery({
    queryKey: ["autonomy-topics", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topic_autonomy_levels")
        .select("*")
        .eq("organization_id", organizationId)
        .order("current_level", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: avgConfidence } = useQuery({
    queryKey: ["autonomy-avg-confidence", organizationId],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await (supabase
        .from("widget_ai_messages")
        .select("confidence_score, widget_ai_conversations!inner(organization_id)") as any)
        .eq("widget_ai_conversations.organization_id", organizationId)
        .not("confidence_score", "is", null)
        .gte("created_at", sevenDaysAgo);
      if (error) throw error;
      if (!data?.length) return 0;
      const scores = data.map((r: any) => r.confidence_score as number);
      return scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    },
    staleTime: 60_000,
  });

  // Section 3: Confidence histogram
  const { data: histogramData = [] } = useQuery({
    queryKey: ["autonomy-histogram", organizationId],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await (supabase
        .from("widget_ai_messages")
        .select("confidence_score, widget_ai_conversations!inner(organization_id)") as any)
        .eq("widget_ai_conversations.organization_id", organizationId)
        .not("confidence_score", "is", null)
        .gte("created_at", sevenDaysAgo);
      if (error) throw error;
      const buckets = Array.from({ length: 10 }, (_, i) => ({
        bucket: i / 10,
        label: `${(i / 10).toFixed(1)}`,
        count: 0,
      }));
      (data ?? []).forEach((r: any) => {
        const idx = Math.min(Math.floor((r.confidence_score as number) * 10), 9);
        buckets[idx].count++;
      });
      return buckets;
    },
    staleTime: 60_000,
  });

  // Section 4: Guardrail triggers
  const { data: guardrailLogs = [] } = useQuery({
    queryKey: ["autonomy-guardrails", organizationId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await (supabase
        .from("widget_ai_messages")
        .select("id, created_at, conversation_id, confidence_breakdown, widget_ai_conversations!inner(organization_id)") as any)
        .eq("widget_ai_conversations.organization_id", organizationId)
        .eq("confidence_score", 0)
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!data?.length) return [];

      // For each, fetch preceding user message
      const results = await Promise.all(
        (data as any[]).map(async (msg: any) => {
          const { data: prev } = await (supabase
            .from("widget_ai_messages")
            .select("content") as any)
            .eq("conversation_id", msg.conversation_id)
            .eq("role", "user")
            .lt("created_at", msg.created_at)
            .order("created_at", { ascending: false })
            .limit(1);

          const breakdown = msg.confidence_breakdown as Record<string, any> | null;
          const isForcedReview = breakdown?.forced_review === true || breakdown?.forced_review === "true";
          if (!isForcedReview) return null;

          const guardrailType = breakdown?.guardrail_type || breakdown?.reason || "unknown";
          return {
            id: msg.id,
            created_at: msg.created_at,
            user_message: prev?.[0]?.content?.slice(0, 80) || "—",
            guardrail_type: guardrailType,
          };
        })
      );
      return results.filter(Boolean);
    },
    staleTime: 30_000,
  });

  // Update max level mutation
  const updateMaxLevel = useMutation({
    mutationFn: async ({ id, level }: { id: string; level: number | null }) => {
      const { error } = await supabase
        .from("topic_autonomy_levels")
        .update({ override_max_level: level })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Max level updated");
      queryClient.invalidateQueries({ queryKey: ["autonomy-topics", organizationId] });
    },
    onError: () => toast.error("Failed to update max level"),
  });

  const topicsCount = topicLevels.length;
  const highestLevel = topicLevels.length
    ? Math.max(...topicLevels.map((t: any) => t.current_level ?? 0))
    : 0;

  const chartConfig = {
    count: { label: "Messages", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Status Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Topics Tracked</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topicsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Highest Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{LEVEL_NAMES[highestLevel] ?? "—"}</div>
            <p className="text-xs text-muted-foreground">Level {highestLevel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence (7d)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgConfidence != null ? `${(avgConfidence * 100).toFixed(1)}%` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Topic Autonomy Levels Table */}
      <Card>
        <CardHeader>
          <CardTitle>Topic Autonomy Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead className="text-right">Accept Rate</TableHead>
                  <TableHead className="text-right">Avg Confidence</TableHead>
                  <TableHead className="text-right">Eval Score</TableHead>
                  <TableHead>Last Evaluated</TableHead>
                  <TableHead>Max Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topicLevels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No topic autonomy data yet
                    </TableCell>
                  </TableRow>
                ) : (
                  topicLevels.map((topic: any) => {
                    const acceptRate = topic.acceptance_rate != null
                      ? (topic.acceptance_rate * 100)
                      : null;
                    const acceptColor = acceptRate == null
                      ? ""
                      : acceptRate > 85
                        ? "text-green-600"
                        : acceptRate >= 70
                          ? "text-amber-600"
                          : "text-red-600";

                    return (
                      <TableRow key={topic.id}>
                        <TableCell className="font-medium">
                          {formatCategory(topic.intent_category)}
                        </TableCell>
                        <TableCell>
                          <Badge className={LEVEL_COLORS[topic.current_level ?? 0]}>
                            {LEVEL_NAMES[topic.current_level ?? 0]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{topic.total_responses ?? 0}</TableCell>
                        <TableCell className={`text-right ${acceptColor}`}>
                          {acceptRate != null ? `${acceptRate.toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {topic.avg_confidence != null
                            ? `${(topic.avg_confidence * 100).toFixed(1)}%`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {topic.avg_eval_score != null
                            ? `${(topic.avg_eval_score * 100).toFixed(1)}%`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {topic.last_evaluated_at
                            ? formatRelativeTime(topic.last_evaluated_at)
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={topic.override_max_level != null ? String(topic.override_max_level) : "none"}
                            onValueChange={(val) =>
                              updateMaxLevel.mutate({
                                id: topic.id,
                                level: val === "none" ? null : Number(val),
                              })
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No limit</SelectItem>
                              <SelectItem value="0">0 — Suggest</SelectItem>
                              <SelectItem value="1">1 — Draft</SelectItem>
                              <SelectItem value="2">2 — Auto-Send</SelectItem>
                              <SelectItem value="3">3 — Full Auto</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 & 4: Charts and guardrail log */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Section 3: Confidence Histogram */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confidence Score Distribution (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            {histogramData.every((b) => b.count === 0) ? (
              <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ReferenceLine x="0.6" stroke="hsl(210, 70%, 55%)" strokeDasharray="5 5" label="L1" />
                  <ReferenceLine x="0.7" stroke="hsl(35, 85%, 55%)" strokeDasharray="5 5" label="L2" />
                  <ReferenceLine x="0.9" stroke="hsl(140, 60%, 45%)" strokeDasharray="5 5" label="L3" />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {histogramData.map((entry, idx) => (
                      <Cell key={idx} fill={getBucketColor(entry.bucket)} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Guardrail Trigger Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Guardrail Triggers (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {guardrailLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No guardrail triggers</p>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto">
                {guardrailLogs.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                    <Clock className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(log.created_at)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {formatCategory(String(log.guardrail_type))}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground truncate">{log.user_message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
