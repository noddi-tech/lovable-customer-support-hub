import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, User, Building } from 'lucide-react';

interface SessionDebugInfo {
  frontend_user: any;
  frontend_session: any;
  db_auth_uid: string | null;
  db_organization_id: string | null;
  db_profile_exists: boolean;
  timestamp: string;
}

export function SessionDebugPanel() {
  const { user, session, profile } = useAuth();
  const [debugInfo, setDebugInfo] = useState<SessionDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDebugInfo = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('validate_session_context');
      
      const info: SessionDebugInfo = {
        frontend_user: user ? { id: user.id, email: user.email } : null,
        frontend_session: session ? 'exists' : null,
        db_auth_uid: data?.[0]?.auth_uid || null,
        db_organization_id: data?.[0]?.organization_id || null,
        db_profile_exists: data?.[0]?.profile_exists || false,
        timestamp: new Date().toISOString()
      };
      
      setDebugInfo(info);
      
      if (error) {
        console.error('Session validation error:', error);
      }
    } catch (error) {
      console.error('Debug info fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const getStatusBadge = (condition: boolean, label: string) => (
    <Badge variant={condition ? "default" : "destructive"}>
      {condition ? '✓' : '✗'} {label}
    </Badge>
  );

  const isHealthy = debugInfo && 
    debugInfo.frontend_user && 
    debugInfo.frontend_session && 
    debugInfo.db_auth_uid && 
    debugInfo.db_organization_id && 
    debugInfo.db_profile_exists;

  return (
    <Card className="w-full max-w-2xl mb-4 mx-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Session Debug Panel</CardTitle>
        <Button
          onClick={fetchDebugInfo}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {debugInfo && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Frontend State</span>
                </div>
                {getStatusBadge(!!debugInfo.frontend_user, 'User Exists')}
                {getStatusBadge(!!debugInfo.frontend_session, 'Session Active')}
                {debugInfo.frontend_user && (
                  <div className="text-xs text-muted-foreground">
                    ID: {debugInfo.frontend_user.id}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Database State</span>
                </div>
                {getStatusBadge(!!debugInfo.db_auth_uid, 'Auth UID')}
                {getStatusBadge(debugInfo.db_profile_exists, 'Profile Exists')}
                {debugInfo.db_auth_uid && (
                  <div className="text-xs text-muted-foreground">
                    UID: {debugInfo.db_auth_uid}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="font-medium">Organization</span>
              </div>
              {getStatusBadge(!!debugInfo.db_organization_id, 'Organization ID')}
              {debugInfo.db_organization_id && (
                <div className="text-xs text-muted-foreground">
                  Org: {debugInfo.db_organization_id}
                </div>
              )}
            </div>
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Health</span>
                <Badge variant={isHealthy ? "default" : "destructive"}>
                  {isHealthy ? '✓ Healthy' : '✗ Issues Detected'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last check: {new Date(debugInfo.timestamp).toLocaleTimeString()}
              </div>
            </div>
            
            {profile && (
              <div className="pt-2 border-t text-xs space-y-1">
                <div><strong>Profile:</strong> {profile.full_name} ({profile.email})</div>
                <div><strong>Role:</strong> {profile.role}</div>
                <div><strong>Org ID:</strong> {profile.organization_id}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}