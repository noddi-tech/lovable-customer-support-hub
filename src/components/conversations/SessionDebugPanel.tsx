import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, User, Clock } from 'lucide-react';

interface SessionDebugInfo {
  sessionValid: boolean;
  dbConnectionWorking: boolean;
  authUidWorking: boolean;
  userProfileExists: boolean;
  organizationId: string | null;
  lastChecked: string;
}

export function SessionDebugPanel() {
  const { user, session, validateSession, refreshSession } = useAuth();
  const [debugInfo, setDebugInfo] = useState<SessionDebugInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runDiagnostics = async () => {
    setIsChecking(true);
    const startTime = Date.now();

    try {
      const diagnostics: SessionDebugInfo = {
        sessionValid: false,
        dbConnectionWorking: false,
        authUidWorking: false,
        userProfileExists: false,
        organizationId: null,
        lastChecked: new Date().toISOString()
      };

      console.log('=== SESSION DIAGNOSTICS START ===');
      console.log('User:', user?.id);
      console.log('Session expires:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'No session');

      // Test 1: Validate session
      try {
        diagnostics.sessionValid = await validateSession();
        console.log('✓ Session validation:', diagnostics.sessionValid);
      } catch (error) {
        console.error('✗ Session validation failed:', error);
      }

      // Test 2: Database connection
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        diagnostics.dbConnectionWorking = !error;
        console.log('✓ DB connection:', diagnostics.dbConnectionWorking);
        if (error) console.error('DB error:', error);
      } catch (error) {
        console.error('✗ DB connection failed:', error);
      }

      // Test 3: auth.uid() function
      try {
        const { data, error } = await supabase.rpc('get_user_organization_id');
        diagnostics.authUidWorking = !error;
        diagnostics.organizationId = data;
        console.log('✓ auth.uid() working:', diagnostics.authUidWorking, 'Org ID:', data);
        if (error) console.error('auth.uid() error:', error);
      } catch (error) {
        console.error('✗ auth.uid() failed:', error);
      }

      // Test 4: User profile exists
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, organization_id')
            .eq('user_id', user.id)
            .maybeSingle();
          
          diagnostics.userProfileExists = !!data && !error;
          console.log('✓ User profile exists:', diagnostics.userProfileExists, data);
          if (error) console.error('Profile error:', error);
        } catch (error) {
          console.error('✗ Profile check failed:', error);
        }
      }

      const duration = Date.now() - startTime;
      console.log('=== SESSION DIAGNOSTICS END ===', `(${duration}ms)`);

      setDebugInfo(diagnostics);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleRefreshSession = async () => {
    console.log('Refreshing session...');
    await refreshSession();
    setTimeout(() => runDiagnostics(), 1000);
  };

  if (!import.meta.env.DEV) {
    return null; // Only show in development
  }

  return (
    <Card className="m-4 border-2 border-dashed border-warning/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="w-4 h-4" />
          Session Debug Panel
          <Badge variant="outline" className="ml-auto">DEV</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={runDiagnostics}
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
            variant="outline" 
            onClick={handleRefreshSession}
          >
            Refresh Session
          </Button>
        </div>

        {debugInfo && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Badge variant={debugInfo.sessionValid ? "default" : "destructive"} className="w-2 h-2 p-0 rounded-full" />
                Session Valid
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={debugInfo.dbConnectionWorking ? "default" : "destructive"} className="w-2 h-2 p-0 rounded-full" />
                DB Connection
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={debugInfo.authUidWorking ? "default" : "destructive"} className="w-2 h-2 p-0 rounded-full" />
                auth.uid() Working
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={debugInfo.userProfileExists ? "default" : "destructive"} className="w-2 h-2 p-0 rounded-full" />
                Profile Exists
              </div>
            </div>
            
            {debugInfo.organizationId && (
              <div className="text-xs text-muted-foreground">
                Org ID: {debugInfo.organizationId}
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