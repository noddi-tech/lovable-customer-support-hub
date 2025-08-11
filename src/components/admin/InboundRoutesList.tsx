import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Inbox, MailCheck } from 'lucide-react';

interface InboundRoute {
  id: string;
  address: string;
  inbox_id: string | null;
  is_active: boolean;
  created_at: string;
  alias_local_part: string;
  group_email?: string | null;
}

interface InboxRow { id: string; name: string; }

export const InboundRoutesList = () => {
  const routesQuery = useQuery({
    queryKey: ['inbound_routes'],
    queryFn: async (): Promise<InboundRoute[]> => {
      const { data, error } = await supabase
        .from('inbound_routes')
        .select('id,address,inbox_id,is_active,created_at,alias_local_part,group_email')
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
  const [selectedRoute, setSelectedRoute] = useState<InboundRoute | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [publicEmail, setPublicEmail] = useState('');
  const queryClient = useQueryClient();

  const updatePublicEmail = useMutation({
    mutationFn: async ({ id, group_email }: { id: string; group_email: string }) => {
      const { error } = await supabase.from('inbound_routes').update({ group_email }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound_routes'] });
    },
  });

  useEffect(() => {
    if (selectedRoute) {
      const domainPart = (selectedRoute.address.split('@')[1] || '').toLowerCase();
      const topLevel = domainPart.split('.').slice(1).join('.');
      const suggested = `${selectedRoute.alias_local_part}@${topLevel || domainPart}`;
      setPublicEmail(selectedRoute.group_email || suggested);
    }
  }, [selectedRoute]);

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
                  <button type="button" className="font-mono text-sm text-left hover:underline focus:underline focus:outline-none" onClick={() => { setSelectedRoute(r); setIsDialogOpen(true); }} aria-label="View setup instructions">
                    {r.address}
                  </button>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Inbox className="w-3.5 h-3.5" />
                    Delivering to: <span className="font-medium">{r.inbox_id ? inboxMap[r.inbox_id] || 'Inbox' : 'Unassigned'}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => copy(r.address, r.id)}>
                    <Copy className="w-4 h-4 mr-1" /> {copiedId === r.id ? 'Copied' : 'Copy address'}
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => { setSelectedRoute(r); setIsDialogOpen(true); }}>View setup</Button>
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

        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setSelectedRoute(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Set up inbound address</DialogTitle>
              <DialogDescription>Forward your public email to the parse address to deliver into this inbox.</DialogDescription>
            </DialogHeader>

            {selectedRoute && (
              <div className="space-y-5">
                <div>
                  <Label htmlFor="public-email">Public email (what customers send to)</Label>
                  <div className="mt-1 flex gap-2">
                    <Input id="public-email" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} placeholder={`${selectedRoute.alias_local_part}@yourdomain.com`} />
                    <Button
                      onClick={() => updatePublicEmail.mutate({ id: selectedRoute.id, group_email: publicEmail.trim() })}
                      disabled={updatePublicEmail.isPending || publicEmail.trim().length === 0 || (selectedRoute.group_email || '') === publicEmail.trim()}
                    >
                      {updatePublicEmail.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Example: {selectedRoute.alias_local_part}@{(selectedRoute.address.split('@')[1] || '').split('.').slice(1).join('.')}
                  </p>
                </div>

                <div>
                  <Label>Forward to this parse address</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="font-mono text-sm px-2 py-1 rounded bg-muted/50">{selectedRoute.address}</code>
                    <Button variant="outline" size="sm" type="button" onClick={() => copy(selectedRoute.address, selectedRoute.id)}>
                      <Copy className="w-4 h-4 mr-1" /> {copiedId === selectedRoute.id ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>How to implement:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Create or use the public address above in your email provider (e.g., Google Workspace).</li>
                    <li>Set up forwarding from the public address to the parse address.</li>
                    <li>For Google Groups: add the parse address as a member and allow external senders.</li>
                    <li>Send a test email to the public address; it should appear in the linked inbox.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <a href="#sendgrid-setup" className="inline-flex"><Button variant="secondary" type="button">Open SendGrid Setup</Button></a>
                  <a href="#google-group-setup" className="inline-flex"><Button variant="ghost" type="button">Google Groups guide</Button></a>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
