import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Copy, Inbox, MailCheck } from 'lucide-react';

interface InboundRoute {
  id: string;
  address: string;
  inbox_id: string | null;
  is_active: boolean;
  created_at: string;
  alias_local_part: string;
}

interface InboxRow { id: string; name: string; }

export const InboundRoutesList = () => {
  const routesQuery = useQuery({
    queryKey: ['inbound_routes'],
    queryFn: async (): Promise<InboundRoute[]> => {
      const { data, error } = await supabase
        .from('inbound_routes')
        .select('id,address,inbox_id,is_active,created_at,alias_local_part')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as InboundRoute[];
    },
  });

  const inboxesQuery = useQuery({
    queryKey: ['inboxes-basic'],
    queryFn: async (): Promise<InboxRow[]> => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return (data || []).map((i: any) => ({ id: i.id, name: i.name }));
    },
  });

  const inboxMap = useMemo(() => {
    const m: Record<string, string> = {};
    (inboxesQuery.data || []).forEach((i) => { m[i.id] = i.name; });
    return m;
  }, [inboxesQuery.data]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  return (
    <Card className="bg-gradient-surface border-border/50 shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <MailCheck className="w-5 h-5" />
          Inbound Addresses
        </CardTitle>
        <CardDescription>Receiving addresses connected to your inboxes. Forward your public emails to these.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {routesQuery.isLoading || inboxesQuery.isLoading ? (
          <div className="text-sm text-muted-foreground">Loading inbound addresses…</div>
        ) : routesQuery.error ? (
          <div className="text-sm text-destructive">Failed to load inbound addresses</div>
        ) : routesQuery.data && routesQuery.data.length > 0 ? (
          <div className="space-y-2">
            {routesQuery.data.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border/50 p-3 bg-background/50">
                <div className="space-y-1">
                  <div className="font-mono text-sm">{r.address}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Inbox className="w-3.5 h-3.5" />
                    Delivering to: <span className="font-medium">{r.inbox_id ? inboxMap[r.inbox_id] || 'Inbox' : 'Unassigned'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => copy(r.address, r.id)}>
                    <Copy className="w-4 h-4 mr-1" /> {copiedId === r.id ? 'Copied' : 'Copy address'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No inbound addresses yet. Create one below.</div>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            To add a new receiving address, open the SendGrid setup and create an inbound address.
          </div>
          <a href="#sendgrid-setup" className="inline-flex"><Button variant="secondary" type="button">Open Setup</Button></a>
        </div>
      </CardContent>
    </Card>
  );
};
