import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Brain, TrendingUp, CheckCircle, Clock } from "lucide-react";

export function KnowledgeAnalytics({ organizationId }: { organizationId: string }) {
  const { toast } = useToast();

  const { data: stats, refetch } = useQuery({
    queryKey: ['knowledge-analytics', organizationId],
    queryFn: async () => {
      // Get knowledge entries stats
      const { data: entries, error: entriesError } = await supabase
        .from('knowledge_entries')
        .select('quality_score, usage_count, acceptance_count')
        .eq('organization_id', organizationId);

      if (entriesError) throw entriesError;

      // Get response tracking stats
      const { data: tracking, error: trackingError } = await supabase
        .from('response_tracking')
        .select('response_source')
        .eq('organization_id', organizationId);

      if (trackingError) throw trackingError;

      // Get outcomes stats
      const { data: outcomes, error: outcomesError } = await supabase
        .from('response_outcomes')
        .select('conversation_resolved, customer_satisfaction_score, reply_time_seconds')
        .eq('organization_id', organizationId);

      if (outcomesError) throw outcomesError;

      const totalEntries = entries?.length || 0;
      const avgQualityScore = entries?.reduce((sum, e) => sum + e.quality_score, 0) / totalEntries || 0;
      const totalUsage = entries?.reduce((sum, e) => sum + e.usage_count, 0) || 0;
      const totalAcceptance = entries?.reduce((sum, e) => sum + e.acceptance_count, 0) || 0;

      const aiSuggestionCount = tracking?.filter(t => t.response_source === 'ai_suggestion').length || 0;
      const templateCount = tracking?.filter(t => t.response_source === 'template').length || 0;
      const knowledgeBaseCount = tracking?.filter(t => t.response_source === 'knowledge_base').length || 0;

      const resolvedCount = outcomes?.filter(o => o.conversation_resolved).length || 0;
      const avgSatisfaction = outcomes?.reduce((sum, o) => sum + (o.customer_satisfaction_score || 0), 0) / (outcomes?.length || 1) || 0;
      const avgReplyTime = outcomes?.reduce((sum, o) => sum + (o.reply_time_seconds || 0), 0) / (outcomes?.length || 1) || 0;

      return {
        totalEntries,
        avgQualityScore,
        totalUsage,
        totalAcceptance,
        aiSuggestionCount,
        templateCount,
        knowledgeBaseCount,
        resolvedCount,
        avgSatisfaction,
        avgReplyTime,
        totalOutcomes: outcomes?.length || 0,
      };
    },
  });

  const handleAutoPromote = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('auto-promote-responses', {
        body: { organizationId, minQualityScore: 4.0 }
      });

      if (error) throw error;

      toast({
        title: "Auto-promotion complete",
        description: `Promoted ${data.promoted_count} responses to knowledge base`,
      });

      refetch();
    } catch (error) {
      console.error('Auto-promote error:', error);
      toast({
        title: "Auto-promotion failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Knowledge Base Analytics</h2>
          <p className="text-muted-foreground">Track performance and outcomes</p>
        </div>
        <Button onClick={handleAutoPromote}>
          <TrendingUp className="w-4 h-4 mr-2" />
          Auto-Promote Responses
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Knowledge Entries</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEntries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Avg quality: {stats?.avgQualityScore.toFixed(2) || '0.00'}/5.00
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsage || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalAcceptance || 0} accepted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalOutcomes ? ((stats.resolvedCount / stats.totalOutcomes) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.resolvedCount || 0} of {stats?.totalOutcomes || 0} resolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Reply Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgReplyTime ? Math.floor(stats.avgReplyTime / 60) : 0}m
            </div>
            <p className="text-xs text-muted-foreground">
              Satisfaction: {stats?.avgSatisfaction.toFixed(1) || '0.0'}/5.0
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Response Source Distribution</CardTitle>
          <CardDescription>How responses are being generated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">AI Suggestions</span>
              <span className="font-bold">{stats?.aiSuggestionCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Templates</span>
              <span className="font-bold">{stats?.templateCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Knowledge Base</span>
              <span className="font-bold">{stats?.knowledgeBaseCount || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
