import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveGrid, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, LayoutItem } from '@/components/admin/design/components/layouts';
import { AuthContextDebugger } from '@/components/conversations/AuthContextDebugger';
import { SessionDebugPanel } from '@/components/conversations/SessionDebugPanel';
import { SessionHealthMonitor } from '@/components/conversations/SessionHealthMonitor';
import { OrganizationHealthDashboard } from './OrganizationHealthDashboard';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { 
  Bug, 
  Database, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  User, 
  Building, 
  Server,
  Mail,
  Wifi
} from 'lucide-react';

export const SystemHealthPage = () => {
  const { healthState, runHealthCheck, forceRefresh } = useSystemHealth();
  
  const getOverallStatus = () => {
    if (healthState.isChecking) return { label: 'Checking...', variant: 'secondary' as const, icon: RefreshCw };
    if (healthState.isHealthy) return { label: 'All Systems Operational', variant: 'default' as const, icon: CheckCircle2 };
    return { label: 'Issues Detected', variant: 'destructive' as const, icon: AlertTriangle };
  };

  const status = getOverallStatus();
  const StatusIcon = status.icon;

  const checks = [
    { label: 'User Session', ok: healthState.frontendUserExists && healthState.frontendSessionActive, icon: User },
    { label: 'Database Auth', ok: healthState.dbAuthUidValid, icon: Database },
    { label: 'Profile', ok: healthState.dbProfileExists, icon: User },
    { label: 'Organization', ok: !!healthState.dbOrganizationId, icon: Building },
    { label: 'Data Access', ok: healthState.dataAccessOk, icon: Server },
  ];

  const issueCount = checks.filter(c => !c.ok).length;

  return (
    <div className="space-y-6">
      {/* Unified Health Summary Banner */}
      <Card className={`border-2 ${healthState.isHealthy ? 'border-primary/20 bg-primary/5' : 'border-destructive/30 bg-destructive/5'}`}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${healthState.isHealthy ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                <StatusIcon className={`h-6 w-6 ${healthState.isChecking ? 'animate-spin' : ''} ${healthState.isHealthy ? 'text-primary' : 'text-destructive'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">System Health</h2>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                {healthState.lastCheck && (
                  <p className="text-sm text-muted-foreground">
                    Last checked: {healthState.lastCheck.toLocaleTimeString()}
                    {issueCount > 0 && ` • ${issueCount} issue${issueCount > 1 ? 's' : ''}`}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={runHealthCheck}
                disabled={healthState.isChecking}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${healthState.isChecking ? 'animate-spin' : ''}`} />
                Run Check
              </Button>
              {!healthState.isHealthy && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={forceRefresh}
                  disabled={healthState.isChecking}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Attempt Recovery
                </Button>
              )}
            </div>
          </div>

          {/* Quick Status Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {checks.map(({ label, ok, icon: Icon }) => (
              <div
                key={label}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  ok 
                    ? 'bg-primary/5 border-primary/20 text-primary' 
                    : 'bg-destructive/5 border-destructive/20 text-destructive'
                }`}
              >
                {ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{label}</span>
              </div>
            ))}
          </div>

          {/* Error Summary */}
          {healthState.dataAccessError && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-destructive">Error accessing data</p>
                  <p className="text-xs text-destructive/80 font-mono mt-1 break-all">
                    {healthState.dataAccessError}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    See "Auth Context" tab below for detailed explanation and fix steps.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* User Info Summary */}
          {healthState.frontendUserEmail && (
            <div className="mt-4 pt-4 border-t border-border/50 text-sm text-muted-foreground">
              <span className="font-medium">Logged in as:</span> {healthState.frontendUserEmail}
              {healthState.dbOrganizationId && (
                <span className="ml-4">
                  <span className="font-medium">Org:</span> {healthState.dbOrganizationId.slice(0, 8)}...
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs: Email Health + System Diagnostics */}
      <ResponsiveTabs defaultValue="email-health" variant="pills" size="md" equalWidth>
        <ResponsiveTabsList className="w-full mb-6">
          <ResponsiveTabsTrigger value="email-health">
            <Mail className="h-4 w-4 mr-2" />
            Email Health
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="diagnostics">
            <Bug className="h-4 w-4 mr-2" />
            System Diagnostics
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>

        {/* Email Health Tab */}
        <ResponsiveTabsContent value="email-health">
          <OrganizationHealthDashboard />
        </ResponsiveTabsContent>

        {/* System Diagnostics Tab */}
        <ResponsiveTabsContent value="diagnostics">
          <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
            <LayoutItem className="lg:col-span-2">
              <Card className="bg-gradient-surface border-border/50 shadow-surface">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bug className="h-5 w-5 text-primary" />
                    <CardTitle>Detailed Diagnostics</CardTitle>
                  </div>
                  <CardDescription>
                    Explore detailed authentication, session, and recovery information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveTabs defaultValue="context" variant="pills" size="md" equalWidth>
                    <ResponsiveTabsList className="w-full mb-6">
                      <ResponsiveTabsTrigger value="context">
                        <Bug className="h-4 w-4 mr-2" />
                        Auth Context
                      </ResponsiveTabsTrigger>
                      <ResponsiveTabsTrigger value="session">
                        <Database className="h-4 w-4 mr-2" />
                        Session Status
                      </ResponsiveTabsTrigger>
                      <ResponsiveTabsTrigger value="recovery">
                        <Activity className="h-4 w-4 mr-2" />
                        Recovery Tools
                      </ResponsiveTabsTrigger>
                    </ResponsiveTabsList>
                    
                    <ResponsiveTabsContent value="context">
                      <AuthContextDebugger />
                    </ResponsiveTabsContent>
                    
                    <ResponsiveTabsContent value="session">
                      <div className="flex justify-center">
                        <SessionDebugPanel />
                      </div>
                    </ResponsiveTabsContent>
                    
                    <ResponsiveTabsContent value="recovery">
                      <div className="flex justify-center">
                        <SessionHealthMonitor showDetails={true} autoRecover={true} />
                      </div>
                    </ResponsiveTabsContent>
                  </ResponsiveTabs>
                </CardContent>
              </Card>
            </LayoutItem>
          </ResponsiveGrid>
        </ResponsiveTabsContent>
      </ResponsiveTabs>
    </div>
  );
};
