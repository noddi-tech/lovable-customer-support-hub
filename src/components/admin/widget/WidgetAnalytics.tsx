import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWidgetAnalytics } from '@/hooks/useWidgetAnalytics';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  MessageCircle, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown,
  Users,
  Mail,
  Timer
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WidgetAnalyticsProps {
  widgetId: string | null;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

export const WidgetAnalytics: React.FC<WidgetAnalyticsProps> = ({ widgetId }) => {
  const { data: analytics, isLoading } = useWidgetAnalytics({ widgetId, days: 30 });

  if (!widgetId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Select a widget to view analytics
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Sessions"
          value={analytics.totalSessions}
          icon={Users}
          trend={analytics.sessionsTrend}
        />
        <MetricCard
          title="Chat Sessions"
          value={analytics.chatSessions}
          icon={MessageCircle}
          trend={analytics.chatsTrend}
        />
        <MetricCard
          title="Contact Forms"
          value={analytics.contactFormSubmissions}
          icon={Mail}
        />
        <MetricCard
          title="Completion Rate"
          value={`${analytics.chatCompletionRate}%`}
          icon={CheckCircle}
          status={analytics.chatCompletionRate > 70 ? 'good' : analytics.chatCompletionRate > 40 ? 'warning' : 'danger'}
        />
      </div>

      {/* Time Metrics */}
      {(analytics.avgChatDurationMinutes !== null || analytics.avgResponseTimeMinutes !== null) && (
        <div className="grid gap-4 md:grid-cols-2">
          {analytics.avgResponseTimeMinutes !== null && (
            <MetricCard
              title="Avg Response Time"
              value={`${analytics.avgResponseTimeMinutes}m`}
              icon={Timer}
              status={analytics.avgResponseTimeMinutes < 5 ? 'good' : analytics.avgResponseTimeMinutes < 15 ? 'warning' : 'danger'}
            />
          )}
          {analytics.avgChatDurationMinutes !== null && (
            <MetricCard
              title="Avg Chat Duration"
              value={`${analytics.avgChatDurationMinutes}m`}
              icon={Clock}
            />
          )}
        </div>
      )}

      {/* Volume Chart */}
      {analytics.volumeByDate.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chat Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.volumeByDate}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Area 
                  type="monotone"
                  dataKey="chats" 
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  name="Chat Sessions"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Breakdowns */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Chat Status Breakdown */}
        {analytics.chatsByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chats by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.chatsByStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {analytics.chatsByStatus.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={CHART_COLORS[index % CHART_COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Pages */}
        {analytics.topPageUrls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPageUrls.map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-mono truncate max-w-[200px]" title={page.url}>
                      {page.url}
                    </span>
                    <span className="text-sm font-medium">{page.count} chats</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty State */}
      {analytics.totalSessions === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No widget activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Embed your widget on your website to start collecting data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  status = 'neutral'
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          {trend !== undefined && trend !== 0 && (
            <div className="flex items-center gap-1 text-sm">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(trend)}% from last period
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${
          status === 'good' ? 'bg-green-100 dark:bg-green-950/30' :
          status === 'warning' ? 'bg-amber-100 dark:bg-amber-950/30' :
          status === 'danger' ? 'bg-red-100 dark:bg-red-950/30' :
          'bg-primary/10'
        }`}>
          <Icon className={`h-5 w-5 ${
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
