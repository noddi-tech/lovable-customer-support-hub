import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Crown, ArrowLeft, Users, Settings, Activity, Pencil } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EditOrganizationModal } from '@/components/organization/EditOrganizationModal';
import { Organization } from '@/hooks/useOrganizations';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch organization details
  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Organization;
    },
    enabled: !!id,
  });

  // Fetch organization stats
  const { data: stats } = useQuery({
    queryKey: ['organization-stats', id],
    queryFn: async () => {
      const [usersResult, conversationsResult] = await Promise.all([
        supabase
          .from('organization_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', id),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', id),
      ]);

      return {
        totalUsers: usersResult.count || 0,
        totalConversations: conversationsResult.count || 0,
      };
    },
    enabled: !!id,
  });

  // Fetch organization members
  const { data: members = [] } = useQuery({
    queryKey: ['organization-members', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          id,
          role,
          status,
          created_at,
          user:profiles(id, email, full_name)
        `)
        .eq('organization_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <UnifiedAppLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </UnifiedAppLayout>
    );
  }

  if (!organization) {
    return (
      <UnifiedAppLayout>
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Organization not found</p>
              <Button onClick={() => navigate('/super-admin/organizations')} className="mt-4">
                Back to Organizations
              </Button>
            </CardContent>
          </Card>
        </div>
      </UnifiedAppLayout>
    );
  }

  return (
    <UnifiedAppLayout>
      <div className="bg-gradient-to-br from-yellow-50/30 via-background to-amber-50/20 dark:from-yellow-950/10 dark:via-background dark:to-amber-950/10 min-h-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/super-admin/organizations')}
            className="h-auto p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: organization.primary_color }}
              >
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <Heading level={1} className="text-3xl font-bold">
                    {organization.name}
                  </Heading>
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                    <Crown className="h-3 w-3 mr-1" />
                    Super Admin View
                  </Badge>
                </div>
                <p className="text-muted-foreground">/{organization.slug}</p>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowEditModal(true)} variant="outline" className="border-yellow-300 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950/30">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Organization
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
              <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
              <Settings className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {new Date(organization.created_at).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="border-yellow-200 dark:border-yellow-900/50">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Card className="border-yellow-200 dark:border-yellow-900/50">
              <CardHeader>
                <CardTitle>Organization Members</CardTitle>
                <CardDescription>Users with access to this organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">{member.user?.full_name || member.user?.email}</p>
                          <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{member.role}</Badge>
                        <Badge variant={member.status === 'active' ? 'default' : 'outline'}>
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {members.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No members yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="border-yellow-200 dark:border-yellow-900/50">
              <CardHeader>
                <CardTitle>Organization Settings</CardTitle>
                <CardDescription>Configuration and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Primary Color</label>
                  <div className="flex items-center gap-3 mt-2">
                    <div
                      className="h-10 w-10 rounded border"
                      style={{ backgroundColor: organization.primary_color }}
                    />
                    <code className="text-sm bg-muted px-2 py-1 rounded">{organization.primary_color}</code>
                  </div>
                </div>
                {organization.sender_display_name && (
                  <div>
                    <label className="text-sm font-medium">Sender Display Name</label>
                    <p className="text-sm text-muted-foreground mt-1">{organization.sender_display_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card className="border-yellow-200 dark:border-yellow-900/50">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Organization activity log</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">Activity log coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {organization && (
        <EditOrganizationModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          organization={organization}
        />
      )}
    </UnifiedAppLayout>
  );
}
