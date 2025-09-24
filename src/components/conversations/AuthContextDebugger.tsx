import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, User, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AuthDebugInfo {
  frontendUser: any;
  frontendSession: any;
  dbAuthUid: string | null;
  dbOrgId: string | null;
  dbDeptId: string | null;
  profileExists: boolean;
  conversationsCount: number;
  lastChecked: string;
}

export function AuthContextDebugger() {
  const { user, session, refreshSession, validateSession } = useAuth();
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runFullDiagnostics = async () => {
    setIsChecking(true);
    
    try {
      console.log('=== FULL AUTH DIAGNOSTICS ===');
      
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
        lastChecked: new Date().toISOString()
      };

      // Test database auth context
      try {
        const { data: authCheck, error: authError } = await supabase.rpc('get_user_organization_id');
        if (authError) {
          console.error('DB auth check failed:', authError);
          diagnostics.dbAuthUid = 'ERROR: ' + authError.message;
        } else {
          diagnostics.dbOrgId = authCheck;
          diagnostics.dbAuthUid = 'working';
        }
      } catch (error) {
        console.error('DB auth check exception:', error);
        diagnostics.dbAuthUid = 'EXCEPTION';
      }

      // Test department function
      try {
        const { data: deptCheck } = await supabase.rpc('get_user_department_id');
        diagnostics.dbDeptId = deptCheck;
      } catch (error) {
        console.error('Department check failed:', error);
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
          if (profileError) {
            console.error('Profile check error:', profileError);
          } else {
            console.log('Profile found:', profile);
          }
        } catch (error) {
          console.error('Profile check exception:', error);
        }
      }

      // Check conversations access
      try {
        const { data: conversations, error: convError } = await supabase.rpc('get_conversations');
        if (convError) {
          console.error('Conversations check failed:', convError);
          diagnostics.conversationsCount = -1;
        } else {
          diagnostics.conversationsCount = conversations?.length || 0;
        }
      } catch (error) {
        console.error('Conversations check exception:', error);
        diagnostics.conversationsCount = -1;
      }

      console.log('=== DIAGNOSTICS COMPLETE ===', diagnostics);
      setDebugInfo(diagnostics);

    } catch (error) {
      console.error('Full diagnostics failed:', error);
      toast.error('Diagnostics failed: ' + (error as Error).message);
    } finally {
      setIsChecking(false);
    }
  };

  const forceSessionRefresh = async () => {
    console.log('=== FORCING SESSION REFRESH ===');
    
    try {
      // Clear any cached session data
      await supabase.auth.refreshSession();
      
      // Wait a moment for propagation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh our context
      await refreshSession();
      
      // Wait again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Validate
      const isValid = await validateSession();
      
      toast.success(`Session refresh ${isValid ? 'successful' : 'failed'}`);
      
      // Re-run diagnostics
      setTimeout(() => runFullDiagnostics(), 500);
      
    } catch (error) {
      console.error('Session refresh failed:', error);
      toast.error('Session refresh failed');
    }
  };

  // Auto-run diagnostics on mount
  useEffect(() => {
    setTimeout(() => runFullDiagnostics(), 1000);
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <Card className="m-4 border-2 border-dashed border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Auth Context Debugger
          <Badge variant="destructive" className="ml-auto">CRITICAL</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
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
                Run Full Diagnostics
              </>
            )}
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={forceSessionRefresh}
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Force Refresh
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-3">
            <div className="text-xs font-mono bg-muted p-2 rounded space-y-1">
              <div>Frontend User: {debugInfo.frontendUser.id ? '✓' : '✗'} {debugInfo.frontendUser.email}</div>
              <div>Frontend Session: {debugInfo.frontendSession.access_token === 'present' ? '✓' : '✗'}</div>
              <div>DB auth.uid(): {debugInfo.dbAuthUid === 'working' ? '✓' : '✗'} {debugInfo.dbAuthUid}</div>
              <div>DB Org ID: {debugInfo.dbOrgId || 'null'}</div>
              <div>DB Dept ID: {debugInfo.dbDeptId || 'null'}</div>
              <div>Profile Exists: {debugInfo.profileExists ? '✓' : '✗'}</div>
              <div>Conversations: {debugInfo.conversationsCount === -1 ? 'ERROR' : debugInfo.conversationsCount}</div>
            </div>
            
            {debugInfo.dbAuthUid !== 'working' && (
              <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                <strong>CRITICAL:</strong> Database auth context is broken. This is why conversations aren't loading.
                The frontend has a session but the database can't see it.
              </div>
            )}
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              Last checked: {new Date(debugInfo.lastChecked).toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}