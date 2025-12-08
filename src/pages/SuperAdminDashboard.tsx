import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, MessageSquare, Crown, Mail, Database, RefreshCw, AlertTriangle, Loader2, Archive } from 'lucide-react';
import { Heading } from '@/components/ui/heading';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmailHealthDashboard } from '@/components/admin/EmailHealthDashboard';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SelectedOrg {
  id: string;
  name: string;
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Global organization selector
  const [selectedOrg, setSelectedOrg] = useState<SelectedOrg | null>(null);
  
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
  const [closeOldStatus, setCloseOldStatus] = useState<{
    success: boolean;
    count?: number;
    message?: string;
  } | null>(null);

  // Fetch all organizations
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

  // Fetch org-scoped stats
  const { data: stats } = useQuery({
    queryKey: ['super-admin-stats', selectedOrg?.id],
    queryFn: async () => {
      if (!selectedOrg) {
        // Global stats when no org selected
        const [orgsResult, usersResult, conversationsResult] = await Promise.all([
          supabase.from('organizations').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('conversations').select('id', { count: 'exact', head: true }),
        ]);

        return {
          totalOrganizations: orgsResult.count || 0,
          totalUsers: usersResult.count || 0,
          totalConversations: conversationsResult.count || 0,
          isGlobal: true,
        };
      }

      // Org-specific stats
      const [usersResult, conversationsResult] = await Promise.all([
        supabase
          .from('organization_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', selectedOrg.id)
          .eq('status', 'active'),
        supabase
          .from('conversations')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', selectedOrg.id),
      ]);

      return {
        totalOrganizations: 1,
        totalUsers: usersResult.count || 0,
        totalConversations: conversationsResult.count || 0,
        isGlobal: false,
      };
    },
  });

  // Fetch recent organizations (only when global view)
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
    enabled: !selectedOrg,
  });

  // Handle organization selection
  const handleOrgChange = (orgId: string) => {
    const org = allOrganizations.find(o => o.id === orgId);
    if (org) {
      setSelectedOrg({ id: org.id, name: org.name });
      // Clear previous statuses
      setRecoveryStatus(null);
      setCloseOldStatus(null);
    }
  };

  const clearOrgSelection = () => {
    setSelectedOrg(null);
    setRecoveryStatus(null);
    setCloseOldStatus(null);
  };

  // Handle database recovery (now org-scoped)
  const handleDatabaseRecovery = async () => {
    if (!selectedOrg) return;
    
    setIsRecovering(true);
    setRecoveryStatus({ status: 'starting', message: `Initiating database recovery for ${selectedOrg.name}...` });
    
    toast({
      title: 'Database Recovery Started',
      description: `Cleaning up duplicate messages for ${selectedOrg.name}...`,
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('database-recovery', {
        body: { organizationId: selectedOrg.id }
      });
      
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

  // Handle bulk close old conversations (now uses selected org)
  const handleBulkCloseOld = async () => {
    if (!selectedOrg) return;
    
    setIsClosingOld(true);
    setCloseOldStatus(null);
    
    toast({
      title: 'Closing Old Conversations',
      description: `Finding and closing conversations older than 3 months for ${selectedOrg.name}...`,
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('bulk-close-old-conversations', {
        body: { organizationId: selectedOrg.id, monthsOld: 3, dryRun: false }
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

        {/* Organization Selector - Primary control */}
        <Card className="border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-yellow-600" />
              Organization Context
            </CardTitle>
            <CardDescription>
              Select an organization to view scoped data and perform maintenance operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Select value={selectedOrg?.id || ''} onValueChange={handleOrgChange}>
                <SelectTrigger className="w-[320px]">
                  <SelectValue placeholder="Select an organization..." />
                </SelectTrigger>
                <SelectContent>
                  {allOrganizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedOrg && (
                <Button variant="ghost" size="sm" onClick={clearOrgSelection}>
                  View Global
                </Button>
              )}
              
              {selectedOrg && (
                <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                  {selectedOrg.name}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          {!selectedOrg && (
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
          )}

          <Card className="border-yellow-200 dark:border-yellow-900/50 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/super-admin/users')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedOrg ? 'Organization Users' : 'Total Users'}
              </CardTitle>
              <Users className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedOrg ? `Active members in ${selectedOrg.name}` : 'Across all organizations'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50 hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedOrg ? 'Organization Conversations' : 'Total Conversations'}
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedOrg ? `Conversations in ${selectedOrg.name}` : 'System-wide interactions'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Organizations - Only show in global view */}
        {!selectedOrg && (
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
        )}

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

        {/* System Maintenance - Requires Org Selection */}
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-red-600 dark:text-red-500" />
              <CardTitle>System Maintenance</CardTitle>
              {selectedOrg && (
                <Badge variant="outline" className="ml-2">{selectedOrg.name}</Badge>
              )}
            </div>
            <CardDescription>Database health and recovery tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedOrg && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Select an organization above to perform maintenance operations
                </AlertDescription>
              </Alert>
            )}

            {/* Database Recovery Section */}
            <div className={`border border-border rounded-lg p-4 space-y-3 ${!selectedOrg ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Database Recovery</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clean up duplicate messages and optimize database storage
                    {selectedOrg && <span className="font-medium"> for {selectedOrg.name}</span>}
                  </p>
                </div>
                <Button
                  onClick={handleDatabaseRecovery}
                  disabled={isRecovering || !selectedOrg}
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
            <div className={`border border-border rounded-lg p-4 space-y-3 ${!selectedOrg ? 'opacity-50' : ''}`}>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Bulk Close Old Conversations</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Close all open conversations older than 3 months
                    {selectedOrg && <span className="font-medium"> for {selectedOrg.name}</span>}
                  </p>
                </div>
                
                <Button
                  onClick={handleBulkCloseOld}
                  disabled={isClosingOld || !selectedOrg}
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
                      Close Old Conversations
                    </>
                  )}
                </Button>
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

        {/* Email Health Dashboard - Requires Org Selection */}
        <Card className="border-blue-200 dark:border-blue-900/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              <CardTitle>Email Health & Monitoring</CardTitle>
              {selectedOrg && (
                <Badge variant="outline" className="ml-2">{selectedOrg.name}</Badge>
              )}
            </div>
            <CardDescription>Monitor email ingestion, webhook status, and troubleshoot delivery issues</CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedOrg ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Select an organization above to view email health data
                </AlertDescription>
              </Alert>
            ) : (
              <EmailHealthDashboard organizationId={selectedOrg.id} organizationName={selectedOrg.name} />
            )}
          </CardContent>
        </Card>
      </div>
    </UnifiedAppLayout>
  );
}
