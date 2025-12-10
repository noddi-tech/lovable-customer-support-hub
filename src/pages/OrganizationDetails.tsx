import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Crown, ArrowLeft, Users, Settings, Activity, Pencil, UserPlus, Trash2 } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EditOrganizationModal } from '@/components/organization/EditOrganizationModal';
import { AddMemberDialog } from '@/components/organization/AddMemberDialog';
import { MemberActionMenu } from '@/components/organization/MemberActionMenu';
import { ConfirmDeleteDialog } from '@/components/admin/ConfirmDeleteDialog';
import { Organization, useOrganizations } from '@/hooks/useOrganizations';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';

export default function OrganizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { deleteOrganization } = useOrganizations();

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

  // Fetch organization members with profiles (two-query approach)
  const { data: members = [], isLoading: membersLoading, error: membersError } = useQuery({
    queryKey: ['organization-members', id],
    queryFn: async () => {
      console.log('🔍 [OrganizationDetails] Starting member fetch for org:', id);
      
      // Query 1: Get all memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_memberships')
        .select('id, role, status, created_at, user_id')
        .eq('organization_id', id)
        .order('created_at', { ascending: false });

      if (membershipsError) {
        console.error('❌ [OrganizationDetails] Error fetching memberships:', membershipsError);
        throw membershipsError;
      }

      console.log('✅ [OrganizationDetails] Memberships fetched:', memberships?.length || 0, memberships);

      if (!memberships || memberships.length === 0) {
        console.log('⚠️ [OrganizationDetails] No memberships found');
        return [];
      }

      // Query 2: Get all profiles for the user_ids
      const userIds = memberships.map(m => m.user_id).filter(Boolean);
      console.log('🔍 [OrganizationDetails] Fetching profiles for user_ids:', userIds);

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('❌ [OrganizationDetails] Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('✅ [OrganizationDetails] Profiles fetched:', profiles?.length || 0, profiles);

      // Merge memberships with profiles
      const merged = memberships.map(membership => {
        const profile = profiles?.find(p => p.user_id === membership.user_id);
        console.log(`🔗 [OrganizationDetails] Merging membership ${membership.id}:`, {
          user_id: membership.user_id,
          found_profile: !!profile,
          profile_email: profile?.email,
          profile_name: profile?.full_name
        });
        return {
          ...membership,
          user: profile || null
        };
      });

      console.log('✅ [OrganizationDetails] Final merged members:', merged);
      return merged;
    },
    enabled: !!id,
    refetchOnMount: 'always', // 🔥 Force refetch, bypass cache
    staleTime: 0, // 🔥 Data is immediately stale
    gcTime: 0, // 🔥 Don't cache this query
  });

  if (isLoading) {
    return (
      <AdminPortalLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminPortalLayout>
    );
  }

  if (!organization) {
    return (
      <AdminPortalLayout>
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
      </AdminPortalLayout>
    );
  }

  // Debug: Log render state
  if (membersError) {
    console.error('❌ [OrganizationDetails] Members query error:', membersError);
  }
  
  console.log('📊 [OrganizationDetails] Render state:', {
    membersCount: members.length,
    isLoading: membersLoading,
    hasError: !!membersError,
    members: members
  });

  return (
    <AdminPortalLayout>
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
          <div className="flex gap-2">
            <Button onClick={() => setShowEditModal(true)} variant="outline" className="border-yellow-300 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950/30">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organization Members</CardTitle>
                    <CardDescription>Users with access to this organization</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowAddMemberDialog(true)}
                    size="sm"
                    className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member: any) => {
                    console.log('🎨 [OrganizationDetails] Rendering member:', {
                      id: member.id,
                      user_id: member.user_id,
                      has_user: !!member.user,
                      user_email: member.user?.email,
                      user_name: member.user?.full_name
                    });
                    
                    return (
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
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{member.role}</Badge>
                          <Badge variant={member.status === 'active' ? 'default' : 'outline'}>
                            {member.status}
                          </Badge>
                          <MemberActionMenu member={member} organizationId={id!} />
                        </div>
                      </div>
                    );
                  })}
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
        <>
          <EditOrganizationModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            organization={organization}
          />
          
          <AddMemberDialog
            open={showAddMemberDialog}
            onOpenChange={setShowAddMemberDialog}
            organizationId={id!}
            existingMemberIds={members.map((m: any) => m.user_id)}
          />

          <ConfirmDeleteDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onConfirm={() => {
              deleteOrganization(id!, {
                onSuccess: () => {
                  navigate('/super-admin/organizations');
                },
              });
            }}
            title="Delete Organization"
            description={`Are you sure you want to delete "${organization.name}"? This will permanently remove all data associated with this organization. This action cannot be undone.`}
            itemName={organization.name}
          />
        </>
      )}
    </AdminPortalLayout>
  );
}
