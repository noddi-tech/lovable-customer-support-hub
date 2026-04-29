// Public status page for Meta data-deletion requests.
// Reachable at /data-deletion-status/:code without authentication.
// RLS allows public SELECT on recruitment_meta_data_deletion_requests by code.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface DeletionRequest {
  confirmation_code: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at: string | null;
}

export default function DataDeletionStatus() {
  const { code } = useParams<{ code: string }>();
  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data, error } = await supabase
        .from('recruitment_meta_data_deletion_requests' as any)
        .select('confirmation_code, status, created_at, completed_at')
        .eq('confirmation_code', code)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else {
        setRequest(data as unknown as DeletionRequest | null);
      }
      setLoading(false);
    })();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Status for sletting av data</h1>
        <p className="text-sm text-muted-foreground">
          Bekreftelseskode: <span className="font-mono">{code}</span>
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Henter status…</p>
        ) : error ? (
          <p className="text-sm text-destructive">Kunne ikke hente status: {error}</p>
        ) : !request ? (
          <p className="text-sm text-muted-foreground">
            Vi finner ingen forespørsel med denne koden. Det kan ta noen minutter
            før den blir tilgjengelig.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              <span className="font-medium">
                {request.status === 'pending' && 'Under behandling'}
                {request.status === 'completed' && 'Fullført'}
                {request.status === 'failed' && 'Feilet'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Forespurt: </span>
              {new Date(request.created_at).toLocaleString('nb-NO')}
            </div>
            {request.completed_at ? (
              <div>
                <span className="text-muted-foreground">Fullført: </span>
                {new Date(request.completed_at).toLocaleString('nb-NO')}
              </div>
            ) : null}
            <p className="pt-3 text-xs text-muted-foreground">
              Tilgangstokens og Facebook-bruker-ID for kontoen som ba om sletting
              er fjernet fra våre systemer. Dersom du har spørsmål, kontakt support@noddi.co.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
