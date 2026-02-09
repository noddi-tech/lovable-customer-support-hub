import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiAnalytics } from '@/hooks/useAiAnalytics';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  Bot, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown,
  MessageCircle, CheckCircle, ArrowRightLeft, Lightbulb, Wrench,
} from 'lucide-react';

interface AiAnalyticsDashboardProps {
  organizationId: string | null;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2, 160 60% 45%))',
  'hsl(var(--chart-3, 30 80% 55%))',
  'hsl(var(--chart-4, 280 65% 60%))',
  'hsl(var(--chart-5, 340 75% 55%))',
];

const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: 'Knowledge Search',
  lookup_customer: 'Customer Lookup',
  get_booking_details: 'Booking Details',
  reschedule_booking: 'Reschedule',
  cancel_booking: 'Cancel Booking',
};

export const AiAnalyticsDashboard: React.FC<AiAnalyticsDashboardProps> = ({ organizationId }) => {
  const { data: analytics, isLoading } = useAiAnalytics({ organizationId, days: 30 });

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No organization selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="AI Conversations"
          value={analytics.totalConversations}
          icon={Bot}
          trend={analytics.conversationTrend}
        />
        <MetricCard
          title="Resolution Rate"
          value={`${analytics.resolutionRate}%`}
          icon={CheckCircle}
          subtitle={`${analytics.resolvedByAi} resolved by AI`}
          status={analytics.resolutionRate > 60 ? 'good' : analytics.resolutionRate > 30 ? 'warning' : 'neutral'}
        />
        <MetricCard
          title="Satisfaction"
          value={`${analytics.satisfactionRate}%`}
          icon={ThumbsUp}
          subtitle={`${analytics.positiveRatings} 👍 / ${analytics.negativeRatings} 👎`}
          status={analytics.satisfactionRate > 80 ? 'good' : analytics.satisfactionRate > 50 ? 'warning' : 'danger'}
        />
        <MetricCard
          title="Escalations"
          value={analytics.escalatedToHuman}
          icon={ArrowRightLeft}
          subtitle="Transferred to human"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Messages"
          value={analytics.totalMessages}
          icon={MessageCircle}
        />
        <MetricCard
          title="Avg Messages/Conv"
          value={analytics.avgMessagesPerConversation}
          icon={MessageCircle}
        />
        <MetricCard
          title="Pending Knowledge"
          value={analytics.pendingKnowledgeEntries}
          icon={Lightbulb}
          subtitle="Auto-learned entries to review"
          status={analytics.pendingKnowledgeEntries > 10 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Volume Chart */}
      {analytics.volumeByDate.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">AI Conversation Volume (Last 30 Days)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.volumeByDate}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                <Area type="monotone" dataKey="conversations" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Conversations" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Feedback Chart */}
        {analytics.feedbackByDate.some(d => d.positive > 0 || d.negative > 0) && (
          <Card>
            <CardHeader><CardTitle className="text-base">Feedback Over Time</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.feedbackByDate.filter(d => d.positive > 0 || d.negative > 0)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="positive" fill="hsl(142 71% 45%)" name="Positive" stackId="a" />
                  <Bar dataKey="negative" fill="hsl(0 84% 60%)" name="Negative" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tool Usage */}
        {analytics.toolUsage.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="h-4 w-4" /> Tool Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.toolUsage.map((tool, i) => {
                  const maxCount = analytics.toolUsage[0]?.count || 1;
                  const pct = Math.round((tool.count / maxCount) * 100);
                  return (
                    <div key={tool.tool}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{TOOL_LABELS[tool.tool] || tool.tool}</span>
                        <span className="font-medium">{tool.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Intents */}
      {analytics.topIntents.length > 0 && analytics.topIntents[0].intent !== 'unknown' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Customer Intents</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.topIntents.map(intent => (
                <Badge key={intent.intent} variant="secondary" className="text-sm">
                  {intent.intent} <span className="ml-1 text-muted-foreground">({intent.count})</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {analytics.totalConversations === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No AI conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              AI analytics will appear once customers start chatting with your AI assistant
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, trend, subtitle, status = 'neutral' }) => (
  <Card>
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend !== undefined && trend !== 0 && (
            <div className="flex items-center gap-1 text-xs">
              {trend > 0 ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
              <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(trend)}% from last period
              </span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-full ${
          status === 'good' ? 'bg-green-100 dark:bg-green-950/30' :
          status === 'warning' ? 'bg-amber-100 dark:bg-amber-950/30' :
          status === 'danger' ? 'bg-red-100 dark:bg-red-950/30' :
          'bg-primary/10'
        }`}>
          <Icon className={`h-4 w-4 ${
            status === 'good' ? 'text-green-600 dark:text-green-400' :
            status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
            status === 'danger' ? 'text-red-600 dark:text-red-400' :
            'text-primary'
          }`} />
        </div>
      </div>
    </CardContent>
  </Card>
);
