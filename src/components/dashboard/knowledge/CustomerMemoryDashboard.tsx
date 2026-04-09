import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, Brain, Clock, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDateFormatting } from "@/hooks/useDateFormatting";

interface Props {
  organizationId: string;
}

const MEMORY_TYPE_COLORS: Record<string, string> = {
  vehicle: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  fact: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  preference: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  issue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  sentiment: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export function CustomerMemoryDashboard({ organizationId }: Props) {
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { relative, dateTime } = useDateFormatting();

  // Stats queries
  const { data: summaries } = useQuery({
    queryKey: ["customer-summaries", organizationId, search],
    queryFn: async () => {
      let query = (supabase.from("customer_summaries").select("*") as any)
        .eq("organization_id", organizationId)
        .order("last_seen_at", { ascending: false })
        .limit(50);
      if (search) {
        query = query.ilike("customer_identifier", `%${search}%`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30_000,
  });

  const { data: allMemories } = useQuery({
    queryKey: ["customer-memories-all", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("customer_memories").select("*") as any)
        .eq("organization_id", organizationId)
        .eq("is_active", true);
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });

  const { data: recentMemories } = useQuery({
    queryKey: ["customer-memories-recent", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("customer_memories").select("*") as any)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30_000,
  });

  // Expanded row memories
  const { data: expandedMemories } = useQuery({
    queryKey: ["customer-memories-expanded", organizationId, expandedRow],
    queryFn: async () => {
      if (!expandedRow) return [];
      const { data, error } = await (supabase.from("customer_memories").select("*") as any)
        .eq("organization_id", organizationId)
        .eq("customer_identifier", expandedRow)
        .eq("is_active", true)
        .order("confidence", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!expandedRow,
    staleTime: 30_000,
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_memories").update({ is_active: false } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Memory deactivated" });
      queryClient.invalidateQueries({ queryKey: ["customer-memories"] });
      queryClient.invalidateQueries({ queryKey: ["customer-memories-all", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["customer-memories-expanded", organizationId, expandedRow] });
      queryClient.invalidateQueries({ queryKey: ["customer-memories-recent", organizationId] });
    },
  });

  // Compute stats
  const uniqueCustomers = summaries?.length ?? 0;
  const totalActive = allMemories?.length ?? 0;
  const typeCounts = (allMemories ?? []).reduce((acc: Record<string, number>, m: any) => {
    acc[m.memory_type] = (acc[m.memory_type] || 0) + 1;
    return acc;
  }, {});
  const now = Date.now();
  const recent24h = (allMemories ?? []).filter((m: any) => now - new Date(m.created_at).getTime() < 86400000).length;

  // Memory counts per customer
  const memoryCounts = (allMemories ?? []).reduce((acc: Record<string, number>, m: any) => {
    acc[m.customer_identifier] = (acc[m.customer_identifier] || 0) + 1;
    return acc;
  }, {});

  const SentimentIcon = ({ trend }: { trend: string | null }) => {
    if (trend === "improving") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "declining") return <TrendingDown className="w-4 h-4 text-red-500" />;
    if (trend === "stable") return <Minus className="w-4 h-4 text-muted-foreground" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers with Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Memories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Memories by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-0.5">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize">{type}</span>
                  <span className="font-medium">{count as number}</span>
                </div>
              ))}
              {Object.keys(typeCounts).length === 0 && <span className="text-muted-foreground">No data</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Auto-Extractions (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recent24h}</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Customer Profile Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Profile Browser
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Customer</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Memories</TableHead>
                <TableHead>Convos</TableHead>
                <TableHead>Sentiment</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>First Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(summaries ?? []).map((row: any) => (
                <Collapsible
                  key={row.id}
                  open={expandedRow === row.customer_identifier}
                  onOpenChange={(open) => setExpandedRow(open ? row.customer_identifier : null)}
                  asChild
                >
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow className="cursor-pointer">
                        <TableCell>
                          {expandedRow === row.customer_identifier ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{row.customer_identifier}</span>
                            <Badge variant="outline" className="text-xs">{row.identifier_type}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {row.summary_text?.slice(0, 120)}
                        </TableCell>
                        <TableCell>{memoryCounts[row.customer_identifier] ?? 0}</TableCell>
                        <TableCell>{row.total_conversations ?? 0}</TableCell>
                        <TableCell><SentimentIcon trend={row.sentiment_trend} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.last_seen_at ? relative(row.last_seen_at) : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.first_seen_at ? dateTime(row.first_seen_at, false) : "—"}</TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <tr>
                        <td colSpan={8} className="p-4 bg-muted/30">
                          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {(expandedMemories ?? []).map((mem: any) => (
                              <div key={mem.id} className="border rounded-lg p-3 bg-background space-y-2">
                                <div className="flex items-center justify-between">
                                  <Badge className={MEMORY_TYPE_COLORS[mem.memory_type] ?? "bg-muted"}>
                                    {mem.memory_type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round((mem.confidence ?? 0) * 100)}%
                                  </span>
                                </div>
                                <p className="text-sm">{mem.memory_text}</p>
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">{relative(mem.created_at)}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-destructive h-6"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deactivateMutation.mutate(mem.id);
                                    }}
                                  >
                                    Deactivate
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {expandedMemories?.length === 0 && (
                              <p className="text-sm text-muted-foreground col-span-full">No active memories</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              ))}
              {summaries?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No customer profiles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 3: Recent Extractions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Extractions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(recentMemories ?? []).map((mem: any) => (
              <div key={mem.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <span className="text-xs text-muted-foreground w-20 shrink-0">{relative(mem.created_at)}</span>
                <span className="text-sm font-medium w-32 truncate shrink-0">{mem.customer_identifier}</span>
                <Badge className={`${MEMORY_TYPE_COLORS[mem.memory_type] ?? "bg-muted"} shrink-0`}>
                  {mem.memory_type}
                </Badge>
                <span className="text-sm text-muted-foreground truncate flex-1">{mem.memory_text?.slice(0, 80)}</span>
                <span className={`text-xs font-medium shrink-0 ${
                  (mem.confidence ?? 0) > 0.8 ? "text-green-600" : (mem.confidence ?? 0) > 0.6 ? "text-amber-600" : "text-muted-foreground"
                }`}>
                  {Math.round((mem.confidence ?? 0) * 100)}%
                </span>
              </div>
            ))}
            {recentMemories?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No recent extractions</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
