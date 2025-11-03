import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, MessageSquare, Activity, Crown } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [orgsResult, usersResult, conversationsResult] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
      ]);

      return {
        totalOrganizations: orgsResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalConversations: conversationsResult.count || 0,
      };
    },
  });

  // Fetch recent organizations
  const { data: recentOrgs = [] } = useQuery({
    queryKey: ['recent-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, slug, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <UnifiedAppLayout>
      <div className="bg-gradient-to-br from-yellow-50/30 via-background to-amber-50/20 dark:from-yellow-950/10 dark:via-background dark:to-amber-950/10 min-h-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
              <Heading level={1} className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-500 dark:to-amber-500 bg-clip-text text-transparent">
                Super Admin Dashboard
              </Heading>
            </div>
            <p className="text-muted-foreground">System-wide overview and management</p>
          </div>
          <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400 px-4 py-2">
            <Crown className="h-4 w-4 mr-2" />
            Super Admin Access
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-yellow-200 dark:border-yellow-900/50 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/super-admin/organizations')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Building2 className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Active tenants in the system</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/super-admin/users')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all organizations</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
              <MessageSquare className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">System-wide interactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Organizations */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Organizations</CardTitle>
                <CardDescription>Latest organizations added to the system</CardDescription>
              </div>
              <Button onClick={() => navigate('/super-admin/organizations')} variant="outline" className="border-yellow-300 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950/30">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrgs.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/super-admin/organizations/${org.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">/{org.slug}</p>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(org.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {recentOrgs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No organizations yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <Button
                onClick={() => navigate('/super-admin/organizations')}
                variant="outline"
                className="justify-start h-auto py-4 border-yellow-300 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950/30"
              >
                <Building2 className="h-5 w-5 mr-3 text-yellow-600 dark:text-yellow-500" />
                <div className="text-left">
                  <div className="font-medium">Manage Organizations</div>
                  <div className="text-sm text-muted-foreground">Create, edit, and configure tenants</div>
                </div>
              </Button>
              <Button
                onClick={() => navigate('/super-admin/users')}
                variant="outline"
                className="justify-start h-auto py-4 border-yellow-300 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950/30"
              >
                <Users className="h-5 w-5 mr-3 text-yellow-600 dark:text-yellow-500" />
                <div className="text-left">
                  <div className="font-medium">Manage Users</div>
                  <div className="text-sm text-muted-foreground">Cross-organization user administration</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedAppLayout>
  );
}
