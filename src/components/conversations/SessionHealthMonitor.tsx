import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Zap, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { useAggressiveSessionRecovery } from '@/hooks/useAggressiveSessionRecovery';

interface SessionHealthMonitorProps {
  showDetails?: boolean;
  autoRecover?: boolean;
}

export function SessionHealthMonitor({ showDetails = false, autoRecover = true }: SessionHealthMonitorProps) {
  const {
    healthState,
    isRecovering,
    performHealthCheck,
    aggressiveRecovery,
    nuclearSessionReset,
    canRecover
  } = useAggressiveSessionRecovery();

  // Auto-run health check on mount when in debug/details mode
  useEffect(() => {
    if (showDetails && healthState.lastCheck === null) {
      performHealthCheck();
    }
  }, [showDetails, healthState.lastCheck, performHealthCheck]);

  // Show critical alert when session is unhealthy
  if (!healthState.isHealthy && healthState.consecutiveFailures > 0) {
    return (
      <div className="space-y-3 w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Session synchronization issue detected. This may prevent conversations from loading properly.
            {healthState.consecutiveFailures >= 3 && (
              <span className="font-semibold"> Multiple failures detected - immediate action required.</span>
            )}
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={performHealthCheck}
            disabled={isRecovering}
            variant="outline"
            size="sm"
          >
            <Activity className={`h-4 w-4 mr-2 ${isRecovering ? 'animate-spin' : ''}`} />
            Check Health
          </Button>

          {canRecover && (
            <Button
              onClick={aggressiveRecovery}
              disabled={isRecovering}
              variant="default"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRecovering ? 'animate-spin' : ''}`} />
              Recover Session
            </Button>
          )}

          {healthState.consecutiveFailures >= 3 && (
            <Button
              onClick={nuclearSessionReset}
              disabled={isRecovering}
              variant="destructive"
              size="sm"
            >
              <Zap className="h-4 w-4 mr-2" />
              Force Re-login
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Show details card when requested (debug panel)
  if (showDetails) {
    const CheckItem = ({ ok, label }: { ok: boolean; label: string }) => (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <div className="flex items-center gap-2">
          {ok ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-sm">{label}</span>
        </div>
        <Badge variant={ok ? "default" : "destructive"} className="text-xs">
          {ok ? "OK" : "FAIL"}
        </Badge>
      </div>
    );

    return (
      <Card className="w-full border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Session Health & Recovery
            </CardTitle>
            <Badge variant={healthState.isHealthy ? "default" : "destructive"}>
              {healthState.isHealthy ? "Healthy" : "Unhealthy"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/30 rounded-lg px-3">
            <CheckItem ok={healthState.authUidValid} label="Auth UID Valid" />
            <CheckItem ok={healthState.sessionValid} label="Session Valid" />
            <CheckItem ok={healthState.profileExists} label="Profile Exists" />
            <CheckItem ok={healthState.organizationValid} label="Organization Valid" />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              <span className="font-medium">Last Check:</span> {healthState.lastCheck?.toLocaleTimeString() || 'Never'}
            </div>
            <div>
              <span className="font-medium">Failures:</span> {healthState.consecutiveFailures}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={performHealthCheck}
              disabled={isRecovering}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Activity className={`h-4 w-4 mr-2 ${isRecovering ? 'animate-spin' : ''}`} />
              Check Now
            </Button>
            
            {!healthState.isHealthy && canRecover && (
              <Button
                onClick={aggressiveRecovery}
                disabled={isRecovering}
                variant="default"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRecovering ? 'animate-spin' : ''}`} />
                Recover
              </Button>
            )}
          </div>
          
          {healthState.consecutiveFailures >= 3 && (
            <Button
              onClick={nuclearSessionReset}
              disabled={isRecovering}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              Force Re-login (Nuclear Reset)
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
