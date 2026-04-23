import { AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useFailureCount } from './hooks/useFailureCount';

export function FailureBanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading } = useFailureCount();
  const count = data?.count ?? 0;

  if (isLoading || count === 0) return null;

  const label =
    count === 1
      ? '1 automasjonsregel feilet og krever oppmerksomhet'
      : `${count} automasjonsregler feilet og krever oppmerksomhet`;

  return (
    <div className="transition-opacity duration-200">
      <Alert variant="destructive" className="flex items-start justify-between gap-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex flex-1 items-center justify-between gap-4 pr-0">
          <span>{label}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/30 bg-background/70 text-destructive hover:bg-destructive/10"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.set('tab', 'automation');
              next.set('subtab', 'log');
              navigate(`/admin/recruitment?${next.toString()}`);
            }}
          >
            Se utførelseslogg
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}