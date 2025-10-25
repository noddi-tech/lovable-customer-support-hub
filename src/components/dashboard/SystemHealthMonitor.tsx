import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Activity, TrendingUp, Database, RefreshCw, FileText } from "lucide-react";
import { useState } from "react";

interface HealthMetric {
  metric: string;
  total_count: number;
  avg_quality: number;
  high_quality_count: number;
  recently_updated: number;
}

export function SystemHealthMonitor({ organizationId }: { organizationId: string }) {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: healthData, refetch, isLoading } = useQuery({
    queryKey: ['system-health', organizationId],
    queryFn: async () => {
      // Fetch data from all three tables
      const [entries, tracking, outcomes] = await Promise.all([
        supabase.from('knowledge_entries').select('quality_score, updated_at').eq('organization_id', organizationId),
        supabase.from('response_tracking').select('feedback_rating, created_at').eq('organization_id', organizationId),
        supabase.from('response_outcomes').select('customer_satisfaction_score, conversation_resolved, created_at').eq('organization_id', organizationId)
      ]);

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      return [
        {
          metric: 'knowledge_entries',
          total_count: entries.data?.length || 0,
          avg_quality: entries.data?.reduce((sum, e) => sum + e.quality_score, 0) / (entries.data?.length || 1) || 0,
          high_quality_count: entries.data?.filter(e => e.quality_score >= 4.0).length || 0,
          recently_updated: entries.data?.filter(e => new Date(e.updated_at) > sevenDaysAgo).length || 0,
        },
        {
          metric: 'response_tracking',
          total_count: tracking.data?.length || 0,
          avg_quality: tracking.data?.filter(t => t.feedback_rating).reduce((sum, t) => sum + (t.feedback_rating || 0), 0) / (tracking.data?.filter(t => t.feedback_rating).length || 1) || 0,
          high_quality_count: tracking.data?.filter(t => t.feedback_rating && t.feedback_rating >= 4).length || 0,
          recently_updated: tracking.data?.filter(t => new Date(t.created_at) > sevenDaysAgo).length || 0,
        },
        {
          metric: 'response_outcomes',
          total_count: outcomes.data?.length || 0,
          avg_quality: outcomes.data?.reduce((sum, o) => sum + (o.customer_satisfaction_score || 0), 0) / (outcomes.data?.length || 1) || 0,
          high_quality_count: outcomes.data?.filter(o => o.conversation_resolved).length || 0,
          recently_updated: outcomes.data?.filter(o => new Date(o.created_at) > sevenDaysAgo).length || 0,
        },
      ] as HealthMetric[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleBatchUpdateEmbeddings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('batch-update-embeddings', {
        body: { organizationId, batchSize: 50 }
      });

      if (error) throw error;

      toast({
        title: "Batch update complete",
        description: `Updated ${data.updated_count} embeddings, ${data.failed_count} failed`,
      });

      refetch();
    } catch (error) {
      console.error('Batch update error:', error);
      toast({
        title: "Batch update failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-analytics-report', {
        body: { organizationId, periodDays: 30 }
      });

      if (error) throw error;

      // Create a downloadable JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-analytics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Report generated",
        description: "Analytics report downloaded successfully",
      });
    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: "Report generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const getHealthStatus = (metric: HealthMetric) => {
    const activityRate = metric.total_count > 0 
      ? (metric.recently_updated / metric.total_count) * 100 
      : 0;
    
    if (activityRate > 20) return { label: 'Healthy', color: 'bg-green-500' };
    if (activityRate > 10) return { label: 'Moderate', color: 'bg-yellow-500' };
    return { label: 'Low Activity', color: 'bg-red-500' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6" />
            System Health Monitor
          </h2>
          <p className="text-muted-foreground">Real-time knowledge base health metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleBatchUpdateEmbeddings}>
            <Database className="w-4 h-4 mr-2" />
            Update Embeddings
          </Button>
          <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
            <FileText className="w-4 h-4 mr-2" />
            {isGeneratingReport ? 'Generating...' : 'Download Report'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {healthData?.map((metric) => {
          const status = getHealthStatus(metric);
          return (
            <Card key={metric.metric}>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="capitalize">{metric.metric.replace('_', ' ')}</span>
                  <Badge className={status.color}>{status.label}</Badge>
                </CardTitle>
                <CardDescription>System component health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Records</span>
                  <span className="font-bold">{metric.total_count}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Avg Quality</span>
                  <span className="font-bold">{metric.avg_quality?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">High Quality</span>
                  <span className="font-bold">
                    {metric.high_quality_count} ({metric.total_count > 0 
                      ? ((metric.high_quality_count / metric.total_count) * 100).toFixed(0) 
                      : 0}%)
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Last 7 Days
                  </span>
                  <span className="font-bold">{metric.recently_updated}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>Automated maintenance tasks running in the background</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Auto-Promote Quality Responses</p>
                <p className="text-sm text-muted-foreground">Runs daily at 2:00 AM UTC</p>
              </div>
              <Badge variant="outline">Daily</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Recalculate Quality Scores</p>
                <p className="text-sm text-muted-foreground">Runs weekly on Sunday at 3:00 AM UTC</p>
              </div>
              <Badge variant="outline">Weekly</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Cleanup Old Tracking Data</p>
                <p className="text-sm text-muted-foreground">Runs monthly on 1st at 4:00 AM UTC</p>
              </div>
              <Badge variant="outline">Monthly</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
