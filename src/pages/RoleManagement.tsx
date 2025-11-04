import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Search, Users, Crown, UserCog, User as UserIcon } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface UserWithRoles {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  roles: Array<{
    id: string;
    role: string;
    created_at: string;
  }>;
  organization_memberships?: Array<{
    id: string;
    organization: {
      name: string;
      slug: string;
    };
    role: string;
    status: string;
  }>;
}

export default function RoleManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'super_admin' | 'admin' | 'agent' | 'user'>('all');

  // Fetch all users with their roles
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          email,
          full_name
        `)
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const [rolesResult, orgsResult] = await Promise.all([
            supabase
              .from('user_roles')
              .select('id, role, created_at')
              .eq('user_id', profile.user_id),
            supabase
              .from('organization_memberships')
              .select(`
                id,
                role,
                status,
                organization:organizations(name, slug)
              `)
              .eq('user_id', profile.user_id)
              .eq('status', 'active')
          ]);

          return {
            ...profile,
            roles: rolesResult.data || [],
            organization_memberships: orgsResult.data || [],
          };
        })
      );

      return usersWithRoles as UserWithRoles[];
    },
  });

  // Fetch role statistics
  const { data: roleStats } = useQuery({
    queryKey: ['role-statistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role');

      if (error) throw error;

      const stats = {
        super_admin: data.filter(r => r.role === 'super_admin').length,
        admin: data.filter(r => r.role === 'admin').length,
        agent: data.filter(r => r.role === 'agent').length,
        user: data.filter(r => r.role === 'user').length,
        total: data.length,
      };

      return stats;
    },
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = selectedRole === 'all' || 
      user.roles.some(r => r.role === selectedRole);

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      case 'agent': return 'outline';
      default: return 'outline';
    }
  };

  const roleInfo = {
    super_admin: { icon: Crown, label: 'Super Admin', color: 'text-yellow-600 dark:text-yellow-500' },
    admin: { icon: Shield, label: 'Admin', color: 'text-blue-600 dark:text-blue-500' },
    agent: { icon: UserCog, label: 'Agent', color: 'text-green-600 dark:text-green-500' },
    user: { icon: UserIcon, label: 'User', color: 'text-gray-600 dark:text-gray-400' },
  };

  return (
    <UnifiedAppLayout>
      <div className="bg-gradient-to-br from-blue-50/30 via-background to-indigo-50/20 dark:from-blue-950/10 dark:via-background dark:to-indigo-950/10 min-h-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-500" />
              <Heading level={1} className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 bg-clip-text text-transparent">
                Role Management
              </Heading>
            </div>
            <p className="text-muted-foreground">Manage system-wide user roles and permissions</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border-blue-200 dark:border-blue-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats?.total || 0}</div>
            </CardContent>
          </Card>
          
          {(['super_admin', 'admin', 'agent', 'user'] as const).map((role) => {
            const info = roleInfo[role];
            return (
              <Card key={role} className="border-blue-200 dark:border-blue-900/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{info.label}</CardTitle>
                  <info.icon className={`h-4 w-4 ${info.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{roleStats?.[role] || 0}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Tabs value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="super_admin">Super Admin</TabsTrigger>
                  <TabsTrigger value="admin">Admin</TabsTrigger>
                  <TabsTrigger value="agent">Agent</TabsTrigger>
                  <TabsTrigger value="user">User</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardHeader>
            <CardTitle>Users & Roles</CardTitle>
            <CardDescription>
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No users found matching your search' : 'No users yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{user.full_name || user.email}</p>
                          {user.roles.some(r => r.role === 'super_admin') && (
                            <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        
                        {/* Organization memberships */}
                        {user.organization_memberships && user.organization_memberships.length > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Organizations:</span>
                            {user.organization_memberships.slice(0, 3).map((membership: any) => (
                              <Badge key={membership.id} variant="outline" className="text-xs">
                                {membership.organization.name} ({membership.role})
                              </Badge>
                            ))}
                            {user.organization_memberships.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.organization_memberships.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user.roles.length === 0 ? (
                        <Badge variant="outline">No roles</Badge>
                      ) : (
                        user.roles.map((roleItem) => (
                          <Badge key={roleItem.id} variant={getRoleBadgeVariant(roleItem.role)}>
                            {roleItem.role.replace('_', ' ')}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedAppLayout>
  );
}
