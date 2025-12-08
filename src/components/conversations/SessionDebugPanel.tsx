import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Database, User, Building, CheckCircle2, XCircle, Clock } from 'lucide-react';

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

  const isHealthy = debugInfo && 
    debugInfo.frontend_user && 
    debugInfo.frontend_session && 
    debugInfo.db_auth_uid && 
    debugInfo.db_organization_id && 
    debugInfo.db_profile_exists;

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
        <span className="text-xs text-muted-foreground font-mono truncate max-w-[180px]">
          {value}
        </span>
      )}
    </div>
  );

  return (
    <Card className="w-full max-w-2xl border-border/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">Session Status</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isHealthy ? "default" : "destructive"}>
            {isHealthy ? 'Healthy' : 'Issues'}
          </Badge>
          <Button
            onClick={fetchDebugInfo}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {debugInfo && (
          <>
            {/* Frontend State */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Frontend</span>
              </div>
              <div className="bg-muted/30 rounded-lg px-3">
                <CheckItem ok={!!debugInfo.frontend_user} label="User Exists" value={debugInfo.frontend_user?.email} />
                <CheckItem ok={!!debugInfo.frontend_session} label="Session Active" />
              </div>
            </div>
            
            {/* Database State */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Database</span>
              </div>
              <div className="bg-muted/30 rounded-lg px-3">
                <CheckItem ok={!!debugInfo.db_auth_uid} label="Auth UID" value={debugInfo.db_auth_uid?.slice(0, 8)} />
                <CheckItem ok={debugInfo.db_profile_exists} label="Profile Exists" />
              </div>
            </div>
            
            {/* Organization */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Organization</span>
              </div>
              <div className="bg-muted/30 rounded-lg px-3">
                <CheckItem ok={!!debugInfo.db_organization_id} label="Org ID" value={debugInfo.db_organization_id?.slice(0, 8)} />
              </div>
            </div>
            
            {/* Profile Info */}
            {profile && (
              <div className="pt-2 border-t border-border/50 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{profile.full_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium">{profile.role}</span>
                </div>
              </div>
            )}
            
            {/* Timestamp */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2">
              <Clock className="w-3 h-3" />
              Last check: {new Date(debugInfo.timestamp).toLocaleTimeString()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
