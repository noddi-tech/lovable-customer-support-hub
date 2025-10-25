import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, TrendingUp, MessageSquare, Clock } from "lucide-react";
import { format } from "date-fns";

interface PerformanceData {
  response_source: string;
  date: string;
  total_suggestions: number;
  rated_suggestions: number;
  avg_rating: number;
  resolved_count: number;
  avg_reply_time: number;
  avg_satisfaction: number;
}

export function SuggestionPerformance({ organizationId }: { organizationId: string }) {
  const { data: performanceData } = useQuery({
    queryKey: ['suggestion-performance', organizationId],
    queryFn: async () => {
      // Query response tracking with outcomes and aggregate
      const { data: tracking, error } = await supabase
        .from('response_tracking')
        .select(`
          *,
          response_outcomes(*)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate by date and source
      const aggregated: Record<string, PerformanceData> = {};
      
      tracking?.forEach((row: any) => {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        const key = `${date}-${row.response_source}`;
        
        if (!aggregated[key]) {
          aggregated[key] = {
            response_source: row.response_source,
            date,
            total_suggestions: 0,
            rated_suggestions: 0,
            avg_rating: 0,
            resolved_count: 0,
            avg_reply_time: 0,
            avg_satisfaction: 0,
          };
        }
        
        aggregated[key].total_suggestions += 1;
        if (row.feedback_rating) {
          aggregated[key].rated_suggestions += 1;
          aggregated[key].avg_rating += row.feedback_rating;
        }
        
        const outcomes = row.response_outcomes || [];
        outcomes.forEach((outcome: any) => {
          if (outcome.conversation_resolved) {
            aggregated[key].resolved_count += 1;
          }
          if (outcome.reply_time_seconds) {
            aggregated[key].avg_reply_time += outcome.reply_time_seconds;
          }
          if (outcome.customer_satisfaction_score) {
            aggregated[key].avg_satisfaction += outcome.customer_satisfaction_score;
          }
        });
      });
      
      // Calculate averages
      return Object.values(aggregated).map((item) => ({
        ...item,
        avg_rating: item.rated_suggestions > 0 ? item.avg_rating / item.rated_suggestions : 0,
        avg_reply_time: item.total_suggestions > 0 ? item.avg_reply_time / item.total_suggestions : 0,
        avg_satisfaction: item.total_suggestions > 0 ? item.avg_satisfaction / item.total_suggestions : 0,
      }));
    },
  });

  // Aggregate stats for the last 30 days
  const stats = performanceData?.reduce(
    (acc, row) => {
      if (row.response_source === 'ai_suggestion') {
        acc.ai.total += row.total_suggestions;
        acc.ai.rated += row.rated_suggestions;
        acc.ai.ratingSum += row.avg_rating * row.rated_suggestions;
        acc.ai.resolved += row.resolved_count;
      } else if (row.response_source === 'template') {
        acc.template.total += row.total_suggestions;
        acc.template.rated += row.rated_suggestions;
        acc.template.ratingSum += row.avg_rating * row.rated_suggestions;
        acc.template.resolved += row.resolved_count;
      } else if (row.response_source === 'knowledge_base') {
        acc.knowledge.total += row.total_suggestions;
        acc.knowledge.rated += row.rated_suggestions;
        acc.knowledge.ratingSum += row.avg_rating * row.rated_suggestions;
        acc.knowledge.resolved += row.resolved_count;
      }
      return acc;
    },
    {
      ai: { total: 0, rated: 0, ratingSum: 0, resolved: 0 },
      template: { total: 0, rated: 0, ratingSum: 0, resolved: 0 },
      knowledge: { total: 0, rated: 0, ratingSum: 0, resolved: 0 },
    }
  );

  const calculateAvgRating = (ratingSum: number, ratedCount: number) => {
    return ratedCount > 0 ? (ratingSum / ratedCount).toFixed(2) : 'N/A';
  };

  const calculateResolutionRate = (resolved: number, total: number) => {
    return total > 0 ? ((resolved / total) * 100).toFixed(1) : '0.0';
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Suggestion Performance</h2>
        <p className="text-muted-foreground">Last 30 days of AI suggestion metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-2xl font-bold">
                {stats ? calculateAvgRating(stats.ai.ratingSum, stats.ai.rated) : 'N/A'}
              </span>
              <span className="text-sm text-muted-foreground">/5.00</span>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                {stats?.ai.rated || 0} ratings from {stats?.ai.total || 0} uses
              </p>
              <p className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stats ? calculateResolutionRate(stats.ai.resolved, stats.ai.total) : '0.0'}% resolution
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Templates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-2xl font-bold">
                {stats ? calculateAvgRating(stats.template.ratingSum, stats.template.rated) : 'N/A'}
              </span>
              <span className="text-sm text-muted-foreground">/5.00</span>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                {stats?.template.rated || 0} ratings from {stats?.template.total || 0} uses
              </p>
              <p className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stats ? calculateResolutionRate(stats.template.resolved, stats.template.total) : '0.0'}% resolution
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Knowledge Base
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <Star className="w-4 h-4 text-primary fill-primary" />
              <span className="text-2xl font-bold">
                {stats ? calculateAvgRating(stats.knowledge.ratingSum, stats.knowledge.rated) : 'N/A'}
              </span>
              <span className="text-sm text-muted-foreground">/5.00</span>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-muted-foreground">
                {stats?.knowledge.rated || 0} ratings from {stats?.knowledge.total || 0} uses
              </p>
              <p className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {stats ? calculateResolutionRate(stats.knowledge.resolved, stats.knowledge.total) : '0.0'}% resolution
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Trend</CardTitle>
          <CardDescription>Daily suggestion usage over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {performanceData?.slice(0, 7).map((row) => (
              <div key={`${row.date}-${row.response_source}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(row.date), 'MMM dd')}</span>
                  <span className="text-muted-foreground capitalize">
                    {row.response_source.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">
                    {row.total_suggestions} uses
                  </span>
                  {row.rated_suggestions > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary text-primary" />
                      {row.avg_rating.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
