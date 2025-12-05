import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Inbox, ArrowDownToLine, ArrowUpFromLine, ChevronDown, Info, Send } from 'lucide-react';

interface InboundRoute {
  id: string;
  address: string;
  inbox_id: string | null;
  is_active: boolean;
  created_at: string;
  alias_local_part: string;
  group_email?: string | null;
  sender_display_name?: string | null;
}

interface InboxRow { id: string; name: string; }

export const InboundRoutesContent = () => {
  const routesQuery = useQuery({
    queryKey: ['inbound_routes'],
    queryFn: async (): Promise<InboundRoute[]> => {
      const { data, error } = await supabase
        .from('inbound_routes')
        .select('id,address,inbox_id,is_active,created_at,alias_local_part,group_email,sender_display_name')
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
  const [senderDisplayName, setSenderDisplayName] = useState('');
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
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

  const updateSenderDisplayName = useMutation({
    mutationFn: async ({ id, sender_display_name }: { id: string; sender_display_name: string }) => {
      const { error } = await supabase.from('inbound_routes').update({ sender_display_name }).eq('id', id);
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
      setSenderDisplayName(selectedRoute.sender_display_name || '');
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
      {/* How it works explanation */}
      <Collapsible open={howItWorksOpen} onOpenChange={setHowItWorksOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left">
            <Info className="w-4 h-4" />
            <span>How email channels work</span>
            <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${howItWorksOpen ? 'rotate-180' : ''}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <ArrowDownToLine className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Receiving emails</p>
                <p className="text-muted-foreground">Customers send to your public address (e.g. hei@noddi.no) → Forwarded via SendGrid → Delivered to your inbox</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-accent/10 p-2">
                <ArrowUpFromLine className="w-4 h-4 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Sending replies</p>
                <p className="text-muted-foreground">Agent replies → Sent via SendGrid API → Customer receives from your public address with your sender name</p>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {routesQuery.isLoading || inboxesQuery.isLoading ? (
        <div className="text-sm text-muted-foreground">Loading email channels…</div>
      ) : routesQuery.error ? (
        <div className="text-sm text-destructive">Failed to load email channels</div>
      ) : routesQuery.data && routesQuery.data.length > 0 ? (
        <div className="space-y-2">
          {routesQuery.data.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-md border border-border/50 p-3 bg-background/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <button type="button" className="font-mono text-sm text-left font-medium hover:underline focus:underline focus:outline-none" onClick={() => { setSelectedRoute(r); setIsDialogOpen(true); }} aria-label="View setup instructions">
                  {r.group_email || r.address}
                </button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => copy(r.group_email || r.address, r.id)}>
                    <Copy className="w-4 h-4 mr-1" /> {copiedId === r.id ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => { setSelectedRoute(r); setIsDialogOpen(true); }}>Configure</Button>
                </div>
              </div>
              
              {/* Bidirectional status indicators */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-primary" />
                  <span>Receiving:</span>
                  <span className="text-foreground font-medium">Active</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ArrowUpFromLine className="w-3.5 h-3.5 text-accent-foreground" />
                  <span>Sending as:</span>
                  <span className="text-foreground font-medium">{r.sender_display_name || 'Not configured'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5" />
                  <span>Inbox:</span>
                  <span className="text-foreground font-medium">{r.inbox_id ? inboxMap[r.inbox_id] || 'Inbox' : 'Unassigned'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No email channels configured yet.</div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setSelectedRoute(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure email channel</DialogTitle>
            <DialogDescription>Set up bidirectional email routing for this address.</DialogDescription>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-5">
              {/* Receiving Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ArrowDownToLine className="w-4 h-4 text-primary" />
                  Receiving Settings
                </div>
                
                <div>
                  <Label htmlFor="public-email">Public email address</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">The address customers send emails to</p>
                  <div className="flex gap-2">
                    <Input id="public-email" value={publicEmail} onChange={(e) => setPublicEmail(e.target.value)} placeholder={`${selectedRoute.alias_local_part}@yourdomain.com`} />
                    <Button
                      onClick={() => updatePublicEmail.mutate({ id: selectedRoute.id, group_email: publicEmail.trim() })}
                      disabled={updatePublicEmail.isPending || publicEmail.trim().length === 0 || (selectedRoute.group_email || '') === publicEmail.trim()}
                      size="sm"
                    >
                      {updatePublicEmail.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Forward to parse address</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">Set up forwarding from your public email to this address</p>
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-sm px-2 py-1.5 rounded bg-muted/50 flex-1 truncate">{selectedRoute.address}</code>
                    <Button variant="outline" size="sm" type="button" onClick={() => copy(selectedRoute.address, selectedRoute.id)}>
                      <Copy className="w-4 h-4 mr-1" /> {copiedId === selectedRoute.id ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sending Settings */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ArrowUpFromLine className="w-4 h-4 text-accent-foreground" />
                  Sending Settings
                </div>

                <div>
                  <Label htmlFor="sender-display-name">Sender display name</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">Name shown to customers when you reply (e.g. "Noddi Support")</p>
                  <div className="flex gap-2">
                    <Input 
                      id="sender-display-name" 
                      value={senderDisplayName} 
                      onChange={(e) => setSenderDisplayName(e.target.value)} 
                      placeholder="Your Company Support"
                    />
                    <Button
                      onClick={() => updateSenderDisplayName.mutate({ id: selectedRoute.id, sender_display_name: senderDisplayName.trim() })}
                      disabled={updateSenderDisplayName.isPending || (selectedRoute.sender_display_name || '') === senderDisplayName.trim()}
                      size="sm"
                    >
                      {updateSenderDisplayName.isPending ? 'Saving…' : 'Save'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-3.5 h-3.5" />
                    <span className="font-medium text-foreground">Outbound preview</span>
                  </div>
                  <p>Replies will be sent as: <span className="font-medium text-foreground">{senderDisplayName || 'Your Name'}</span> &lt;{selectedRoute.group_email || publicEmail || 'email@domain.com'}&gt;</p>
                </div>
              </div>

              <Separator />

              {/* Inbox Assignment */}
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

              <Separator />

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Forwarding setup instructions</p>
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
