import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AuthDebugInfo {
  frontendUser: any;
  frontendSession: any;
  dbAuthUid: string | null;
  dbOrgId: string | null;
  dbDeptId: string | null;
  profileExists: boolean;
  conversationsCount: number;
  conversationsError: string | null;
  lastChecked: string;
}

// Helper to get error explanation and fix guidance
function getErrorGuidance(error: string): { explanation: string; fix: string[] } {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes('row-level security') || lowerError.includes('rls')) {
    return {
      explanation: 'Your session token is valid but Row Level Security policies are blocking database access. This usually happens when the session token is stale or the profile is not properly linked to an organization.',
      fix: [
        'Click "Force Refresh" to get a fresh session token',
        'If that doesn\'t work, log out and log back in',
        'If the issue persists, ask an admin to verify your profile is linked to an organization'
      ]
    };
  }
  
  if (lowerError.includes('permission denied')) {
    return {
      explanation: 'Your account lacks the required permissions to access this data. This may be a role or permission configuration issue.',
      fix: [
        'Check that your profile has the correct role assigned',
        'Ask an admin to verify your permissions',
        'Try logging out and back in to refresh your role claims'
      ]
    };
  }
  
  if (lowerError.includes('jwt') || lowerError.includes('token')) {
    return {
      explanation: 'Your authentication token is invalid or expired. This can happen after long periods of inactivity.',
      fix: [
        'Click "Force Refresh" to get a new token',
        'If that fails, log out and log back in',
        'Clear your browser cache if the issue persists'
      ]
    };
  }
  
  if (lowerError.includes('function') && lowerError.includes('not exist')) {
    return {
      explanation: 'A required database function is missing. This is a configuration issue that requires admin intervention.',
      fix: [
        'Contact your system administrator',
        'This may require a database migration to be applied'
      ]
    };
  }
  
  if (lowerError.includes('organization') || lowerError.includes('org')) {
    return {
      explanation: 'Your profile is not linked to an organization. All users must belong to an organization to access data.',
      fix: [
        'Ask an admin to add you to an organization',
        'If you are an admin, go to Organization Settings and verify your profile is linked'
      ]
    };
  }
  
  // Default generic guidance
  return {
    explanation: 'An unexpected error occurred while accessing the database. This may be a temporary issue.',
    fix: [
      'Click "Force Refresh" to refresh your session',
      'Try logging out and back in',
      'If the issue persists, contact support with the error message'
    ]
  };
}

export function AuthContextDebugger() {
  const { user, session, refreshSession, validateSession } = useAuth();
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runFullDiagnostics = async () => {
    setIsChecking(true);
    
    try {
      const diagnostics: AuthDebugInfo = {
        frontendUser: {
          id: user?.id,
          email: user?.email,
          aud: user?.aud,
        },
        frontendSession: {
          access_token: session?.access_token ? 'present' : 'missing',
          refresh_token: session?.refresh_token ? 'present' : 'missing',
          expires_at: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'none',
        },
        dbAuthUid: null,
        dbOrgId: null,
        dbDeptId: null,
        profileExists: false,
        conversationsCount: 0,
        conversationsError: null,
        lastChecked: new Date().toISOString()
      };

      // Test database auth context
      try {
        const { data: authCheck, error: authError } = await supabase.rpc('get_user_organization_id');
        if (authError) {
          diagnostics.dbAuthUid = 'ERROR: ' + authError.message;
        } else {
          diagnostics.dbOrgId = authCheck;
          diagnostics.dbAuthUid = 'working';
        }
      } catch (error) {
        diagnostics.dbAuthUid = 'EXCEPTION';
      }

      // Test department function
      try {
        const { data: deptCheck } = await supabase.rpc('get_user_department_id');
        diagnostics.dbDeptId = deptCheck;
      } catch (error) {
        // Ignore
      }

      // Check if profile exists
      if (user?.id) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, organization_id, department_id, full_name')
            .eq('user_id', user.id)
            .maybeSingle();
          
          diagnostics.profileExists = !!profile && !profileError;
        } catch (error) {
          // Ignore
        }
      }

      // Check conversations access
      try {
        const { data: conversations, error: convError } = await supabase.rpc('get_conversations');
        if (convError) {
          diagnostics.conversationsCount = -1;
          diagnostics.conversationsError = convError.message;
        } else {
          diagnostics.conversationsCount = conversations?.length || 0;
          diagnostics.conversationsError = null;
        }
      } catch (error) {
        diagnostics.conversationsCount = -1;
        diagnostics.conversationsError = (error as Error).message;
      }

      setDebugInfo(diagnostics);

    } catch (error) {
      toast.error('Diagnostics failed: ' + (error as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  const forceSessionRefresh = async () => {
    try {
      await supabase.auth.refreshSession();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshSession();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isValid = await validateSession();
      toast.success(`Session refresh ${isValid ? 'successful' : 'failed'}`);
      setTimeout(() => runFullDiagnostics(), 500);
    } catch (error) {
      toast.error('Session refresh failed');
    }
  };

  useEffect(() => {
    setTimeout(() => runFullDiagnostics(), 1000);
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  // Determine health status dynamically
  const hasErrors = debugInfo && (
    debugInfo.dbAuthUid !== 'working' ||
    !debugInfo.profileExists ||
    debugInfo.conversationsCount === -1
  );
  
  const hasWarnings = debugInfo && (
    !debugInfo.dbOrgId ||
    !debugInfo.dbDeptId
  );

  const getStatusBadge = () => {
    if (!debugInfo) return null;
    if (hasErrors) return <Badge variant="destructive">Issues Detected</Badge>;
    if (hasWarnings) return <Badge variant="secondary">Warnings</Badge>;
    return <Badge variant="default">Healthy</Badge>;
  };

  const CheckItem = ({ ok, label, value }: { ok: boolean; label: string; value?: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm">{label}</span>
      </div>
      {value && (
        <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
          {value}
        </span>
      )}
    </div>
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            Auth Context Diagnostics
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runFullDiagnostics}
            disabled={isChecking}
            className="flex-1"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database className="w-3 h-3 mr-2" />
                Run Diagnostics
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="default" 
            onClick={forceSessionRefresh}
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Force Refresh
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-4">
            {/* Frontend Checks */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Frontend</h4>
              <div className="bg-muted/30 rounded-lg px-3">
                <CheckItem ok={!!debugInfo.frontendUser.id} label="User Exists" value={debugInfo.frontendUser.email} />
                <CheckItem ok={debugInfo.frontendSession.access_token === 'present'} label="Access Token" value={debugInfo.frontendSession.access_token} />
                <CheckItem ok={debugInfo.frontendSession.refresh_token === 'present'} label="Refresh Token" value={debugInfo.frontendSession.refresh_token} />
              </div>
            </div>

            {/* Database Checks */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Database</h4>
              <div className="bg-muted/30 rounded-lg px-3">
                <CheckItem ok={debugInfo.dbAuthUid === 'working'} label="auth.uid()" value={debugInfo.dbAuthUid || 'null'} />
                <CheckItem ok={debugInfo.profileExists} label="Profile Exists" />
                <CheckItem ok={!!debugInfo.dbOrgId} label="Organization" value={debugInfo.dbOrgId?.slice(0, 8) || 'null'} />
                <CheckItem ok={!!debugInfo.dbDeptId} label="Department" value={debugInfo.dbDeptId?.slice(0, 8) || 'null'} />
              </div>
            </div>

            {/* Data Access */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Data Access</h4>
              <div className="bg-muted/30 rounded-lg px-3">
                <CheckItem 
                  ok={debugInfo.conversationsCount >= 0} 
                  label="Conversations Query" 
                  value={debugInfo.conversationsCount >= 0 ? `${debugInfo.conversationsCount} found` : 'ERROR'} 
                />
              </div>
            </div>
            
            {/* Error Details with Explanation and Fix Guidance */}
            {debugInfo.conversationsError && (
              <div className="space-y-3 border border-destructive/30 rounded-lg p-4 bg-destructive/5">
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-destructive">Data Access Error</h4>
                    <p className="text-sm font-mono text-destructive/80 mt-1 break-all">
                      {debugInfo.conversationsError}
                    </p>
                  </div>
                </div>
                
                {(() => {
                  const guidance = getErrorGuidance(debugInfo.conversationsError);
                  return (
                    <>
                      <div className="flex items-start gap-2 pt-2 border-t border-destructive/20">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-sm font-medium text-foreground">What this means</h5>
                          <p className="text-sm text-muted-foreground mt-1">
                            {guidance.explanation}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2 pt-2 border-t border-destructive/20">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-sm font-medium text-foreground">How to fix</h5>
                          <ol className="text-sm text-muted-foreground mt-1 space-y-1 list-decimal list-inside">
                            {guidance.fix.map((step, i) => (
                              <li key={i}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* Critical Error Alert for Auth */}
            {debugInfo.dbAuthUid !== 'working' && !debugInfo.conversationsError && (
              <div className="flex items-start gap-2 text-sm bg-destructive/10 text-destructive p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <strong>Database auth context is broken.</strong> The frontend has a session but the database can't see it. Try Force Refresh.
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
              <Clock className="w-3 h-3" />
              Last checked: {new Date(debugInfo.lastChecked).toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
