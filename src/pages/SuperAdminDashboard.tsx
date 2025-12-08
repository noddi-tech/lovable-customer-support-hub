import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, MessageSquare, Activity, Crown, Mail, Database, RefreshCw, AlertTriangle, Loader2, Archive } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for database recovery
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<{
    status: string;
    duplicatesDeleted?: number;
    remainingDuplicates?: number;
    message?: string;
  } | null>(null);

  // State for bulk close old conversations
  const [isClosingOld, setIsClosingOld] = useState(false);
  const [bulkCloseOrgId, setBulkCloseOrgId] = useState<string | null>(null);
  const [closeOldStatus, setCloseOldStatus] = useState<{
    success: boolean;
    count?: number;
    message?: string;
  } | null>(null);

  // Fetch all organizations for bulk close selector
  const { data: allOrganizations = [] } = useQuery({
    queryKey: ['all-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .order('name', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

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

  // Handle database recovery
  const handleDatabaseRecovery = async () => {
    setIsRecovering(true);
    setRecoveryStatus({ status: 'starting', message: 'Initiating database recovery...' });
    
    toast({
      title: 'Database Recovery Started',
      description: 'Cleaning up duplicate messages...',
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('database-recovery');
      
      if (error) throw error;
      
      setRecoveryStatus({
        status: data.status,
        duplicatesDeleted: data.totalDuplicatesDeleted,
        remainingDuplicates: data.remainingDuplicates,
        message: data.status === 'continuing' 
          ? 'Recovery in progress - auto-continuing in background' 
          : data.status === 'complete'
          ? 'Recovery complete!'
          : data.message
      });

      toast({
        title: data.status === 'complete' ? 'Recovery Complete' : 'Recovery Continuing',
        description: data.status === 'continuing' 
          ? `${data.totalDuplicatesDeleted || 0} duplicates deleted. Auto-continuing in background...`
          : `${data.totalDuplicatesDeleted || 0} duplicates deleted successfully.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Recovery failed';
      setRecoveryStatus({
        status: 'error',
        message: errorMessage
      });
      
      toast({
        title: 'Recovery Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsRecovering(false);
    }
  };

  // Handle bulk close old conversations
  const handleBulkCloseOld = async () => {
    if (!bulkCloseOrgId) return;
    
    const selectedOrg = allOrganizations.find(o => o.id === bulkCloseOrgId);
    
    setIsClosingOld(true);
    setCloseOldStatus(null);
    
    toast({
      title: 'Closing Old Conversations',
      description: `Finding and closing conversations older than 3 months for ${selectedOrg?.name || 'selected organization'}...`,
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('bulk-close-old-conversations', {
        body: { organizationId: bulkCloseOrgId, monthsOld: 3, dryRun: false }
      });
      
      if (error) throw error;
      
      setCloseOldStatus({
        success: data.success,
        count: data.count,
        message: data.message
      });

      toast({
        title: 'Bulk Close Complete',
        description: `Closed ${data.count} old conversations.`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bulk close failed';
      setCloseOldStatus({
        success: false,
        message: errorMessage
      });
      
      toast({
        title: 'Bulk Close Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsClosingOld(false);
    }
  };

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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
              <Button
                onClick={() => navigate('/super-admin/email-templates')}
                variant="outline"
                className="justify-start h-auto py-4 border-yellow-300 hover:bg-yellow-50 dark:border-yellow-800 dark:hover:bg-yellow-950/30"
              >
                <Mail className="h-5 w-5 mr-3 text-yellow-600 dark:text-yellow-500" />
                <div className="text-left">
                  <div className="font-medium">System Email Templates</div>
                  <div className="text-sm text-muted-foreground">Customize authentication emails</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* System Maintenance */}
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-red-600 dark:text-red-500" />
              <CardTitle>System Maintenance</CardTitle>
            </div>
            <CardDescription>Database health and recovery tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Database Recovery Section */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Database Recovery</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clean up duplicate messages and optimize database storage
                  </p>
                </div>
                <Button
                  onClick={handleDatabaseRecovery}
                  disabled={isRecovering}
                  variant="outline"
                  size="sm"
                  className="border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                >
                  {isRecovering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start Recovery
                    </>
                  )}
                </Button>
              </div>

              {/* Recovery Status */}
              {recoveryStatus && (
                <div className={`p-3 rounded-md border ${
                  recoveryStatus.status === 'error' 
                    ? 'bg-destructive/10 border-destructive/50' 
                    : recoveryStatus.status === 'complete'
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                    : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900'
                }`}>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {recoveryStatus.status === 'continuing' && '🔄 Recovery in Progress'}
                      {recoveryStatus.status === 'complete' && '✅ Recovery Complete'}
                      {recoveryStatus.status === 'error' && '❌ Recovery Failed'}
                      {recoveryStatus.status === 'starting' && '⏳ Starting...'}
                    </p>
                    {recoveryStatus.message && (
                      <p className="text-sm text-muted-foreground">{recoveryStatus.message}</p>
                    )}
                    {recoveryStatus.duplicatesDeleted !== undefined && (
                      <p className="text-sm font-mono">
                        Deleted: {recoveryStatus.duplicatesDeleted.toLocaleString()} duplicates
                      </p>
                    )}
                    {recoveryStatus.remainingDuplicates !== undefined && recoveryStatus.remainingDuplicates > 0 && (
                      <p className="text-sm font-mono text-muted-foreground">
                        Remaining: {recoveryStatus.remainingDuplicates.toLocaleString()} duplicates
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Auto-continuing recovery</p>
                  <p>Recovery automatically continues in background until complete. Check Supabase Edge Function logs for detailed progress.</p>
                </div>
              </div>
            </div>

            {/* Bulk Close Old Conversations Section */}
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Bulk Close Old Conversations</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Close all open conversations older than 3 months (e.g., HelpScout imports)
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Select value={bulkCloseOrgId || ''} onValueChange={setBulkCloseOrgId}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Select organization..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={handleBulkCloseOld}
                    disabled={isClosingOld || !bulkCloseOrgId}
                    variant="outline"
                    size="sm"
                    className="border-amber-300 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/30"
                  >
                    {isClosingOld ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Closing...
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Close Old
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Close Status */}
              {closeOldStatus && (
                <div className={`p-3 rounded-md border ${
                  !closeOldStatus.success 
                    ? 'bg-destructive/10 border-destructive/50' 
                    : 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                }`}>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {closeOldStatus.success ? '✅ Bulk Close Complete' : '❌ Bulk Close Failed'}
                    </p>
                    {closeOldStatus.message && (
                      <p className="text-sm text-muted-foreground">{closeOldStatus.message}</p>
                    )}
                    {closeOldStatus.count !== undefined && closeOldStatus.success && (
                      <p className="text-sm font-mono">
                        Closed: {closeOldStatus.count.toLocaleString()} conversations
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </UnifiedAppLayout>
  );
}
