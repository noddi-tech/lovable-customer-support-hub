import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Timer,
  Activity,
} from 'lucide-react';
import type { TicketAnalytics } from '@/hooks/useServiceTicketAnalytics';

interface TicketAnalyticsDashboardProps {
  analytics: TicketAnalytics;
}

export const TicketAnalyticsDashboard = ({ analytics }: TicketAnalyticsDashboardProps) => {
  const formatHours = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}h`;
    return `${(hours / 24).toFixed(1)}d`;
  };

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend,
    status = 'neutral'
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: any; 
    trend?: { value: number; label: string };
    status?: 'good' | 'warning' | 'danger' | 'neutral';
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-sm">
                {trend.value > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : trend.value < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                ) : null}
                <span className={trend.value > 0 ? 'text-green-600' : trend.value < 0 ? 'text-red-600' : ''}>
                  {trend.label}
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

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Tickets"
          value={analytics.totalTickets}
          icon={BarChart}
          trend={{
            value: analytics.recentTrends.newThisWeek,
            label: `${analytics.recentTrends.newThisWeek} this week`
          }}
        />
        
        <MetricCard
          title="Open Tickets"
          value={analytics.openTickets}
          subtitle={`${((analytics.openTickets / analytics.totalTickets) * 100).toFixed(0)}%`}
          icon={Activity}
          status={analytics.openTickets > analytics.totalTickets * 0.5 ? 'warning' : 'neutral'}
        />
        
        <MetricCard
          title="Avg Response Time"
          value={formatHours(analytics.avgFirstResponseTimeHours)}
          icon={Timer}
          status={
            analytics.avgFirstResponseTimeHours < 2 ? 'good' :
            analytics.avgFirstResponseTimeHours < 8 ? 'warning' :
            'danger'
          }
        />
        
        <MetricCard
          title="Avg Resolution Time"
          value={formatHours(analytics.avgResolutionTimeHours)}
          icon={Clock}
          status={
            analytics.avgResolutionTimeHours < 24 ? 'good' :
            analytics.avgResolutionTimeHours < 72 ? 'warning' :
            'danger'
          }
        />
      </div>

      {/* SLA & Performance */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5" />
              SLA Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">SLA Compliance</span>
                <Badge variant={analytics.slaBreachRate < 10 ? 'default' : 'destructive'}>
                  {(100 - analytics.slaBreachRate).toFixed(1)}%
                </Badge>
              </div>
              <Progress value={100 - analytics.slaBreachRate} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics.overdueTickets}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">On Track</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.openTickets - analytics.overdueTickets}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Completion</span>
                <Badge variant="default">
                  {analytics.completionRate.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={analytics.completionRate} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.closedTickets}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-2xl font-bold">
                  {analytics.recentTrends.closedThisWeek}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(analytics.ticketsByPriority).map(([priority, count]) => {
              const percentage = analytics.totalTickets > 0 
                ? (count / analytics.totalTickets) * 100 
                : 0;
              
              return (
                <div key={priority} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize font-medium">{priority}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{count}</span>
                      <span className="text-muted-foreground">
                        ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(analytics.ticketsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                <Badge variant="secondary">{count}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
