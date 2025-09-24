import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Zap, Activity } from 'lucide-react';
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

  // Show critical alert when session is unhealthy
  if (!healthState.isHealthy && healthState.consecutiveFailures > 0) {
    return (
      <div className="space-y-3">
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

  // Show details card in development or when requested
  if (showDetails && import.meta.env.DEV) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Session Health Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span>Auth UID:</span>
              <Badge variant={healthState.authUidValid ? "default" : "destructive"}>
                {healthState.authUidValid ? "Valid" : "Invalid"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Session:</span>
              <Badge variant={healthState.sessionValid ? "default" : "destructive"}>
                {healthState.sessionValid ? "Valid" : "Invalid"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Profile:</span>
              <Badge variant={healthState.profileExists ? "default" : "destructive"}>
                {healthState.profileExists ? "Exists" : "Missing"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Organization:</span>
              <Badge variant={healthState.organizationValid ? "default" : "destructive"}>
                {healthState.organizationValid ? "Valid" : "Invalid"}
              </Badge>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            <div>Last Check: {healthState.lastCheck?.toLocaleTimeString() || 'Never'}</div>
            <div>Failures: {healthState.consecutiveFailures}</div>
            <div>Overall Health: 
              <Badge variant={healthState.isHealthy ? "default" : "destructive"} className="ml-1">
                {healthState.isHealthy ? "Healthy" : "Unhealthy"}
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={performHealthCheck}
              disabled={isRecovering}
              variant="outline"
              size="sm"
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
        </CardContent>
      </Card>
    );
  }

  return null;
}