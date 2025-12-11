import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, TrendingUp, Activity, Users, MessageSquare, Building2 } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';
import { useOrganizationStore } from '@/stores/organizationStore';

export default function SystemAnalytics() {
  const { currentOrganizationId } = useOrganizationStore();
  
  // Fetch organization name when selected
  const { data: selectedOrg } = useQuery({
    queryKey: ['organization-name', currentOrganizationId],
    queryFn: async () => {
      if (!currentOrganizationId) return null;
      const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', currentOrganizationId)
        .single();
      return data;
    },
    enabled: !!currentOrganizationId,
  });

  // Fetch analytics - scoped by organization when selected
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['system-analytics', currentOrganizationId],
    queryFn: async () => {
      if (currentOrganizationId) {
        // Organization-scoped analytics
        const [usersResult, conversationsResult, activeUsersResult] = await Promise.all([
          supabase
            .from('organization_memberships')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', currentOrganizationId)
            .eq('status', 'active'),
          supabase
            .from('conversations')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', currentOrganizationId),
          supabase
            .from('organization_memberships')
            .select('user_id', { count: 'exact', head: true })
            .eq('organization_id', currentOrganizationId)
            .eq('status', 'active'),
        ]);

        return {
          totalOrganizations: 1,
          totalUsers: usersResult.count || 0,
          totalConversations: conversationsResult.count || 0,
          activeUsers: activeUsersResult.count || 0,
          isOrgScoped: true,
        };
      }

      // Global analytics
      const [orgsResult, usersResult, conversationsResult, activeUsersResult] = await Promise.all([
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
        isOrgScoped: false,
      };
    },
  });

  return (
    <AdminPortalLayout>
      <div className="min-h-screen bg-gradient-to-br from-yellow-50/30 via-background to-amber-50/20 dark:from-yellow-950/10 dark:via-background dark:to-amber-950/10">
        <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
            <Heading level={1} className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-500 dark:to-amber-500 bg-clip-text text-transparent">
              System Analytics
            </Heading>
            {currentOrganizationId && selectedOrg && (
              <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700 dark:text-yellow-400">
                <Building2 className="h-3 w-3 mr-1" />
                {selectedOrg.name}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {currentOrganizationId ? `Organization metrics for ${selectedOrg?.name || 'selected org'}` : 'System-wide metrics and insights'}
          </p>
        </div>

        {/* Overview Stats */}
        <div className={`grid gap-4 md:grid-cols-2 ${!currentOrganizationId ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          {!currentOrganizationId && (
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
          )}

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{currentOrganizationId ? 'Organization Users' : 'Total Users'}</CardTitle>
              <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{analytics?.totalUsers || 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{currentOrganizationId ? 'Active members' : 'Across all organizations'}</p>
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
              <p className="text-xs text-muted-foreground mt-1">{currentOrganizationId ? 'In this organization' : 'System-wide'}</p>
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
    </AdminPortalLayout>
  );
}
