import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heading } from '@/components/ui/heading';
import { Crown, Users, Search, Building2, RefreshCw } from 'lucide-react';
import { UserActionMenu } from '@/components/admin/UserActionMenu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';

export default function AllUsersManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState<string>('all');

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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground hidden sm:block">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                      <UserActionMenu user={user} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedAppLayout>
  );
}
