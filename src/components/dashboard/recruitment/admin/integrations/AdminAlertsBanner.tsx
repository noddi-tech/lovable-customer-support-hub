import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, KeyRound, X } from 'lucide-react';
import { useAdminAlerts } from '@/hooks/recruitment/useAdminAlerts';

interface Props {
  onRefreshToken: (integrationId: string | null) => void;
}

export function AdminAlertsBanner({ onRefreshToken }: Props) {
  const { alerts, resolveAlert } = useAdminAlerts();
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const isCritical = a.severity === 'critical';
        return (
          <Alert
            key={a.id}
            variant={isCritical ? 'destructive' : 'default'}
            className={!isCritical ? 'border-amber-500/30 bg-amber-500/10' : undefined}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between gap-2">
              <span>
                {a.alert_type === 'token_expired' && 'Meta-token utløpt'}
                {a.alert_type === 'token_expiring_critical' && 'Meta-token utløper snart'}
                {a.alert_type === 'token_expiring_soon' && 'Meta-token utløper'}
                {a.alert_type === 'integration_broken' && 'Meta-integrasjon mangler tilganger'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => resolveAlert.mutate(a.id)}
                aria-label="Lukk varsel"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{a.message}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRefreshToken(a.integration_id)}
              >
                <KeyRound className="h-4 w-4 mr-2" />
                Forny token
              </Button>
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
