import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b'];

export default function AuditLogAnalytics() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate analytics
  const actionTypeDistribution = logs.reduce((acc, log) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const actionTypeData = Object.entries(actionTypeDistribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Activity by day (last 30 days)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const activityByDay = last30Days.map(date => {
    const count = logs.filter(log => log.created_at.startsWith(date)).length;
    return { date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), actions: count };
  });

  // Top actors
  const actorActivity = logs.reduce((acc, log) => {
    acc[log.actor_email] = (acc[log.actor_email] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topActors = Object.entries(actorActivity)
    .map(([email, count]) => ({ email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Risk indicators - detect unusual patterns
  const recentLogs = logs.slice(0, 100);
  const deletionActions = recentLogs.filter(log => log.action_type.includes('delete')).length;
  const bulkActions = recentLogs.filter(log => log.action_category === 'bulk_management').length;
  const highActivityUsers = topActors.filter(actor => actor.count > 50);

  const riskScore = deletionActions * 2 + bulkActions * 3 + highActivityUsers.length * 5;
  const riskLevel = riskScore > 50 ? 'high' : riskScore > 20 ? 'medium' : 'low';

  return (
    <UnifiedAppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <Heading level={1}>Audit Log Analytics</Heading>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Actions</div>
                <div className="text-2xl font-bold">{logs.length}</div>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-20" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Unique Actors</div>
                <div className="text-2xl font-bold">{Object.keys(actorActivity).length}</div>
              </div>
              <Users className="h-8 w-8 text-primary opacity-20" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Action Types</div>
                <div className="text-2xl font-bold">{Object.keys(actionTypeDistribution).length}</div>
              </div>
              <BarChart3 className="h-8 w-8 text-primary opacity-20" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Risk Level</div>
                <Badge variant={riskLevel === 'high' ? 'destructive' : riskLevel === 'medium' ? 'default' : 'secondary'} className="mt-1">
                  {riskLevel.toUpperCase()}
                </Badge>
              </div>
              <AlertTriangle className={`h-8 w-8 opacity-20 ${riskLevel === 'high' ? 'text-destructive' : riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
          </Card>
        </div>

        {/* Activity Heatmap */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Over Time (Last 30 Days)</h3>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="actions" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Action Type Distribution */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Action Type Distribution</h3>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={actionTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {actionTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* Top Actors */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Most Active Users</h3>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {topActors.map((actor, index) => (
                  <div key={actor.email} className="flex items-center justify-between p-2 rounded hover:bg-accent">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                      <span className="text-sm">{actor.email}</span>
                    </div>
                    <Badge variant="outline">{actor.count} actions</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Risk Indicators */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Indicators</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded bg-muted/30">
              <span className="text-sm">Recent Deletion Actions</span>
              <Badge variant={deletionActions > 5 ? 'destructive' : 'secondary'}>
                {deletionActions}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-muted/30">
              <span className="text-sm">Bulk Operations</span>
              <Badge variant={bulkActions > 3 ? 'destructive' : 'secondary'}>
                {bulkActions}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-muted/30">
              <span className="text-sm">High Activity Users (&gt;50 actions)</span>
              <Badge variant={highActivityUsers.length > 2 ? 'destructive' : 'secondary'}>
                {highActivityUsers.length}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </UnifiedAppLayout>
  );
}
