import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, TrendingUp, Activity, Users, MessageSquare } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';

export default function SystemAnalytics() {
  // Fetch system-wide analytics
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['system-analytics'],
    queryFn: async () => {
      // Get counts for various entities
      const [
        orgsResult,
        usersResult,
        conversationsResult,
        activeUsersResult
      ] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      return {
        totalOrganizations: orgsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalConversations: conversationsResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
      };
    },
  });

  return (
    <UnifiedAppLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50/30 via-background to-amber-50/20 dark:from-yellow-950/10 dark:via-background dark:to-amber-950/10">
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
            <Heading level={1} className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-500 dark:to-amber-500 bg-clip-text text-transparent">
              System Analytics
            </Heading>
          </div>
          <p className="text-muted-foreground">System-wide metrics and insights</p>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.totalOrganizations || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Total tenants</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Across all organizations</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users (7d)</CardTitle>
              <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.activeUsers || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.totalConversations || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">System-wide</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Overall system performance and usage metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">User Engagement Rate</p>
                  <p className="text-sm text-muted-foreground">
                    Active users / Total users
                  </p>
                </div>
                <Badge variant="outline" className="text-lg">
                  {analytics?.totalUsers
                    ? Math.round((analytics.activeUsers / analytics.totalUsers) * 100)
                    : 0}
                  %
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Avg Conversations per User</p>
                  <p className="text-sm text-muted-foreground">
                    Total conversations / Total users
                  </p>
                </div>
                <Badge variant="outline" className="text-lg">
                  {analytics?.totalUsers
                    ? Math.round(analytics.totalConversations / analytics.totalUsers)
                    : 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Avg Users per Organization</p>
                  <p className="text-sm text-muted-foreground">
                    Total users / Total organizations
                  </p>
                </div>
                <Badge variant="outline" className="text-lg">
                  {analytics?.totalOrganizations
                    ? Math.round(analytics.totalUsers / analytics.totalOrganizations)
                    : 0}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader>
            <CardTitle>Advanced Analytics</CardTitle>
            <CardDescription>Detailed charts and insights coming soon</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              Advanced analytics dashboard with charts, graphs, and trends will be available here
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </UnifiedAppLayout>
  );
}
