import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Label } from '@/components/ui/label';
import { Crown, Users, Search, Building2, RefreshCw, Activity, UserPlus, X } from 'lucide-react';
import { UserActionMenu } from '@/components/admin/UserActionMenu';
import { UserActivityTimeline } from '@/components/admin/UserActivityTimeline';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';

interface OrgMembership {
  org_id: string;
  org_name: string;
  role: 'admin' | 'agent' | 'user' | 'super_admin';
}

export default function AllUsersManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  const [showActivityTimeline, setShowActivityTimeline] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createUserData, setCreateUserData] = useState({
    email: '',
    password: '',
    full_name: '',
    organizations: [] as OrgMembership[]
  });
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'agent' | 'user' | 'super_admin'>('user');

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  // Fetch all organizations for filter
  const { data: organizations = [] } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all users with their organization memberships using separate queries
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['all-users', orgFilter],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache (formerly cacheTime)
    queryFn: async () => {
      // Query 1: Fetch all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Query 2: Fetch all organization memberships with organizations
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('organization_memberships')
        .select(`
          id,
          user_id,
          role,
          status,
          organization:organizations(id, name)
        `);

      if (membershipsError) throw membershipsError;

      // Join the data in frontend by matching user_id
      const usersWithMemberships = (profilesData || []).map(profile => ({
        ...profile,
        organization_memberships: (membershipsData || []).filter(
          m => m.user_id === profile.user_id
        )
      }));

      // Filter by organization if needed
      if (orgFilter !== 'all') {
        return usersWithMemberships.filter((user: any) =>
          user.organization_memberships?.some(
            (m: any) => m.organization?.id === orgFilter
          )
        );
      }

      return usersWithMemberships;
    },
  });

  const filteredUsers = users.filter((user: any) =>
    (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Create user mutation for super-admin
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof createUserData) => {
      if (userData.organizations.length === 0) {
        throw new Error("At least one organization is required");
      }

      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create organization memberships
      const memberships = userData.organizations.map(org => ({
        user_id: authData.user.id,
        organization_id: org.org_id,
        role: org.role,
        status: 'active'
      }));

      const { error: membershipError } = await supabase
        .from('organization_memberships')
        .insert(memberships);

      if (membershipError) throw membershipError;

      return { user: authData.user, userData };
    },
    onSuccess: async (data, variables) => {
      try {
        await logAction(
          'user.create',
          'user',
          data.user.id,
          variables.email,
          { 
            email: variables.email,
            full_name: variables.full_name,
            organizations: variables.organizations.map(o => ({ 
              org_name: o.org_name, 
              role: o.role 
            }))
          }
        );
      } catch (error) {
        console.error('Failed to log audit action:', error);
      }

      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast({
        title: "User created successfully",
        description: `${variables.full_name} has been added to ${variables.organizations.length} organization(s).`,
      });
      setShowCreateDialog(false);
      setCreateUserData({
        email: '',
        password: '',
        full_name: '',
        organizations: []
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create user",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddOrganization = () => {
    if (!selectedOrg) {
      toast({
        title: "Please select an organization",
        variant: "destructive",
      });
      return;
    }

    const org = organizations.find(o => o.id === selectedOrg);
    if (!org) return;

    // Check if org already added
    if (createUserData.organizations.some(o => o.org_id === selectedOrg)) {
      toast({
        title: "Organization already added",
        variant: "destructive",
      });
      return;
    }

    setCreateUserData(prev => ({
      ...prev,
      organizations: [...prev.organizations, {
        org_id: selectedOrg,
        org_name: org.name,
        role: selectedRole
      }]
    }));

    setSelectedOrg('');
    setSelectedRole('user');
  };

  const handleRemoveOrganization = (orgId: string) => {
    setCreateUserData(prev => ({
      ...prev,
      organizations: prev.organizations.filter(o => o.org_id !== orgId)
    }));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createUserData.email.trim() || !createUserData.password.trim() || !createUserData.full_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Email, password, and full name are required.",
        variant: "destructive",
      });
      return;
    }

    if (createUserData.organizations.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one organization is required.",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(createUserData);
  };

  return (
    <UnifiedAppLayout>
      <div className="bg-gradient-to-br from-yellow-50/30 via-background to-amber-50/20 dark:from-yellow-950/10 dark:via-background dark:to-amber-950/10 min-h-full p-6 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
            <Heading level={1} className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 dark:from-yellow-500 dark:to-amber-500 bg-clip-text text-transparent">
              User Management
            </Heading>
          </div>
          <p className="text-muted-foreground">Manage users across all organizations</p>
        </div>

        {/* Filters */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={orgFilter} onValueChange={setOrgFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by organization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Organizations</SelectItem>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => refetch()} variant="outline" size="default" className="w-full md:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full md:w-auto">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Add a new user and assign them to one or more organizations.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={createUserData.email}
                          onChange={(e) => setCreateUserData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="user@company.com"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Temporary Password *</Label>
                        <Input
                          id="password"
                          type="password"
                          value={createUserData.password}
                          onChange={(e) => setCreateUserData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Minimum 6 characters"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                          id="full_name"
                          value={createUserData.full_name}
                          onChange={(e) => setCreateUserData(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="John Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <Label>Organization Memberships *</Label>
                      <div className="flex gap-2">
                        <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select organization" />
                          </SelectTrigger>
                          <SelectContent>
                            {organizations.map((org) => (
                              <SelectItem key={org.id} value={org.id}>
                                {org.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedRole} onValueChange={(v: 'admin' | 'agent' | 'user' | 'super_admin') => setSelectedRole(v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button type="button" onClick={handleAddOrganization} variant="outline">
                          Add
                        </Button>
                      </div>

                      {createUserData.organizations.length > 0 && (
                        <div className="space-y-2 mt-3">
                          {createUserData.organizations.map((org) => (
                            <div key={org.org_id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/50">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{org.org_name}</span>
                                <Badge variant="secondary" className="text-xs">{org.role}</Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveOrganization(org.org_id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {createUserData.organizations.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          Add at least one organization to continue.
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCreateDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createUserMutation.isPending}
                      >
                        {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-yellow-200 dark:border-yellow-900/50">
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <CardDescription>System-wide user directory</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border">
                    <Skeleton className="h-16 w-full" />
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              ) : (
                filteredUsers.map((user: any) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.full_name || user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {user.organization_memberships?.map((membership: any) => (
                            <div key={membership.id} className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">
                                <Building2 className="h-3 w-3 mr-1" />
                                {membership.organization?.name}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {membership.role}
                              </Badge>
                            </div>
                          ))}
                          {(!user.organization_memberships || user.organization_memberships.length === 0) && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No organizations
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground hidden sm:block">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUserId(user.user_id);
                          setSelectedUserEmail(user.email);
                          setShowActivityTimeline(true);
                        }}
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Activity
                      </Button>
                      <UserActionMenu user={user} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline Modal */}
        {selectedUserId && (
          <UserActivityTimeline
            userId={selectedUserId}
            userEmail={selectedUserEmail}
            open={showActivityTimeline}
            onOpenChange={setShowActivityTimeline}
          />
        )}
      </div>
    </UnifiedAppLayout>
  );
}
