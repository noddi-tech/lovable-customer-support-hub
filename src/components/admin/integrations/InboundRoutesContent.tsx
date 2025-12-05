import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Inbox } from 'lucide-react';

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

export const InboundRoutesContent = () => {
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
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);
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

  const updateRouteInbox = useMutation({
    mutationFn: async ({ id, inbox_id }: { id: string; inbox_id: string | null }) => {
      const { error } = await supabase.from('inbound_routes').update({ inbox_id }).eq('id', id);
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
      setSelectedInboxId(selectedRoute.inbox_id || null);
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
    <div className="space-y-4">
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
                  {r.group_email || r.address}
                </button>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Inbox className="w-3.5 h-3.5" />
                  Delivering to: <span className="font-medium">{r.inbox_id ? inboxMap[r.inbox_id] || 'Inbox' : 'Unassigned'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => copy(r.group_email || r.address, r.id)}>
                  <Copy className="w-4 h-4 mr-1" /> {copiedId === r.id ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" type="button" onClick={() => { setSelectedRoute(r); setIsDialogOpen(true); }}>Configure</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No inbound addresses configured yet.</div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setSelectedRoute(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure inbound address</DialogTitle>
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
              </div>

              <div>
                <Label>Deliver to inbox</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Select
                    value={selectedInboxId || 'none'}
                    onValueChange={(val) => setSelectedInboxId(val === 'none' ? null : val)}
                  >
                    <SelectTrigger className="w-56">
                      <SelectValue placeholder="Select inbox" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {(inboxesQuery.data || []).map((i) => (
                        <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedRoute && updateRouteInbox.mutate({ id: selectedRoute.id, inbox_id: selectedInboxId })}
                    disabled={updateRouteInbox.isPending || (selectedRoute && selectedRoute.inbox_id === selectedInboxId)}
                    variant="outline"
                    size="sm"
                    type="button"
                  >
                    {updateRouteInbox.isPending ? 'Saving…' : 'Save'}
                  </Button>
                </div>
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
                <p>How to set up forwarding:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>In Google Workspace: set up email forwarding from your public address to the parse address above.</li>
                  <li>For Google Groups: add the parse address as a member and allow external senders.</li>
                  <li>Send a test email to verify it appears in the linked inbox.</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
