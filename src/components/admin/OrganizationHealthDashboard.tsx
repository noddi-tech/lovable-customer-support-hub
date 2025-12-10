import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeConnection } from "@/contexts/RealtimeProvider";
import { Activity, Mail, CheckCircle, XCircle, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function OrganizationHealthDashboard() {
  const { connectionStatus } = useRealtimeConnection();

  // Fetch email ingestion stats
  const { data: emailStats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['org-email-stats'],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get today's count
      const { count: todayCount } = await supabase
        .from('email_ingestion_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())
        .eq('status', 'processed');

      // Get 7-day count
      const { count: weekCount } = await supabase
        .from('email_ingestion_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())
        .eq('status', 'processed');

      // Get failure count (7 days)
      const { count: failureCount } = await supabase
        .from('email_ingestion_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())
        .neq('status', 'processed');

      // Get last email
      const { data: lastEmail } = await supabase
        .from('email_ingestion_logs')
        .select('created_at, from_email, subject, status')
        .eq('status', 'processed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      return {
        todayCount: todayCount || 0,
        weekCount: weekCount || 0,
        failureCount: failureCount || 0,
        lastEmail
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading, refetch: refetchActivity } = useQuery({
    queryKey: ['org-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('email_ingestion_logs')
        .select('id, created_at, from_email, subject, status, error_message')
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const handleRefresh = () => {
    refetchStats();
    refetchActivity();
    toast.success("Data refreshed");
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': 
      case 'error': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection Error';
      default: return 'Unknown';
    }
  };

  // Calculate success rate with proper rounding
  const successRate = emailStats?.weekCount 
    ? (100 - (emailStats.failureCount / (emailStats.weekCount + emailStats.failureCount)) * 100).toFixed(1)
    : '100';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Health</h3>
          <p className="text-sm text-muted-foreground">
            Monitor email delivery and real-time connection status
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Real-time Connection */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              Real-time Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getConnectionStatusColor()}`} />
              <span className="text-lg font-semibold">{getConnectionStatusText()}</span>
            </div>
            {connectionStatus !== 'connected' && (
              <p className="text-xs text-muted-foreground mt-1">
                Emails still arrive via webhook
              </p>
            )}
          </CardContent>
        </Card>

        {/* Last Email */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Last Email Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-muted animate-pulse rounded" />
            ) : emailStats?.lastEmail ? (
              <>
                <span className="text-lg font-semibold">
                  {formatDistanceToNow(new Date(emailStats.lastEmail.created_at), { addSuffix: true })}
                </span>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {emailStats.lastEmail.from_email}
                </p>
              </>
            ) : (
              <span className="text-muted-foreground">No emails yet</span>
            )}
          </CardContent>
        </Card>

        {/* Today's Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <span className="text-2xl font-bold">{emailStats?.todayCount || 0}</span>
                <span className="text-sm text-muted-foreground ml-1">emails</span>
              </>
            )}
          </CardContent>
        </Card>

        {/* 7-Day Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              7-Day Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-6 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <span className="text-2xl font-bold">{successRate}%</span>
                <p className="text-xs text-muted-foreground mt-1">
                  {emailStats?.weekCount || 0} processed, {emailStats?.failureCount || 0} failed
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Email Activity</CardTitle>
          <CardDescription>Last 5 email ingestion events</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    {log.status === 'processed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : log.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.from_email || 'Unknown sender'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {log.subject || 'No subject'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={log.status === 'processed' ? 'default' : 'destructive'}>
                      {log.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recent email activity
            </p>
          )}
        </CardContent>
      </Card>

      {/* Troubleshooting Tips */}
      {(connectionStatus !== 'connected' || (emailStats?.failureCount || 0) > 0) && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Troubleshooting
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {connectionStatus !== 'connected' && (
              <p>• <strong>Real-time updates:</strong> Connection will auto-retry. Emails still arrive via webhook.</p>
            )}
            {(emailStats?.failureCount || 0) > 0 && (
              <p>• <strong>Failed emails:</strong> Check Super Admin → Email Health for detailed error logs.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
