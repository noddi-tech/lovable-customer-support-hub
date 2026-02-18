import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MailPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { GoogleGroupSetup } from './GoogleGroupSetup';
import { SendgridWebhookFixer } from './SendgridWebhookFixer';
import { SendGridWebhookTester } from './SendGridWebhookTester';

interface SetupFormValues {
  domain: string;
  parse_subdomain: string;
}

export const SendgridSetupWizard = () => {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [retryStatus, setRetryStatus] = useState<string | null>(null);
  const [dnsVerifiedButPending, setDnsVerifiedButPending] = useState(false);
  const form = useForm<SetupFormValues>({
    defaultValues: { domain: '', parse_subdomain: 'inbound' },
  });

  // Inbound address creation state
  const [alias, setAlias] = useState('');
  const [inboxes, setInboxes] = useState<any[]>([]);
  const [selectedInbox, setSelectedInbox] = useState<string | null>(null);
  const [domainRow, setDomainRow] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);

  const loadDomainAndInboxes = async (d?: string, sub?: string) => {
    const values = form.getValues();
    const domain = d ?? values.domain;
    const parse_subdomain = sub ?? values.parse_subdomain;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: prof } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const { data: dom } = await supabase
      .from('email_domains')
      .select('*')
      .eq('organization_id', prof?.organization_id)
      .eq('domain', domain)
      .eq('parse_subdomain', parse_subdomain)
      .maybeSingle();
    setDomainRow(dom);
    const { data: inboxesData } = await supabase.rpc('get_inboxes');
    setInboxes(inboxesData || []);
    if (inboxesData?.length && !selectedInbox) setSelectedInbox(inboxesData[0].id);
  };

  const createInboundRoute = async () => {
    if (!domainRow?.id || !selectedInbox) {
      toast({ title: 'Missing data', description: 'Select an inbox; ensure domain is created.', variant: 'destructive' });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: 'Auth required', variant: 'destructive' }); return; }
    const { data: prof } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const values = form.getValues();
    const address = `${alias}@${values.parse_subdomain}.${values.domain}`;
    const { data, error } = await supabase
      .from('inbound_routes')
      .insert({
        address,
        alias_local_part: alias,
        domain_id: domainRow.id,
        inbox_id: selectedInbox,
        organization_id: prof?.organization_id,
      })
      .select('*')
      .single();
    if (error) {
      toast({ title: 'Failed to create route', description: error.message, variant: 'destructive' });
    } else {
      setRoute(data);
      toast({ title: 'Inbound address created', description: `${address} is ready.` });
    }
  };

  const onSubmit = async (values: SetupFormValues) => {
    setResult(null);
    const { data, error } = await supabase.functions.invoke('sendgrid-setup', {
      body: values,
    });
    if (error) {
      toast({ title: 'Setup failed', description: error.message, variant: 'destructive' });
      return;
    }
    setResult(data);
    await loadDomainAndInboxes(values.domain, values.parse_subdomain);
    if (data?.ok === false) {
      toast({ title: 'Sender Authentication needed', description: 'We created the sender auth config; add the DNS records then retry.', variant: 'destructive' });
    } else {
      toast({ title: 'Parse route created', description: 'Add the MX record to your DNS and we will verify automatically.' });
    }
  };

  const verifyDns = async () => {
    try {
      const values = form.getValues();
      const dns: any = (result as any)?.dns_records?.sender_auth ?? (result as any)?.sender_auth?.record?.dns;
      if (!dns) {
        toast({ title: 'Run setup first', description: 'Click Create Parse Route to fetch expected DNS records.', variant: 'destructive' });
        return;
      }
      setVerifying(true);
      const normalize = (s: string) => (s || '').toLowerCase().replace(/\.$/, '');
      const mxHost = `${values.parse_subdomain}.${values.domain}`;
      const mxRes = await fetch(`https://dns.google/resolve?name=${mxHost}&type=MX`).then(r => r.json()).catch(() => null);
      const mxOk = !!mxRes?.Answer?.some((a: any) => normalize(a.data.split(' ').pop()) === 'mx.sendgrid.net');

      const cnameRecords = Object.values(dns) as any[];
      const cnameChecks = await Promise.all(
        cnameRecords.map(async (rec: any) => {
          const r = await fetch(`https://dns.google/resolve?name=${rec.host}&type=CNAME`).then(res => res.json()).catch(() => null);
          return !!r?.Answer?.some((a: any) => normalize(a.data) === normalize(rec.data));
        })
      );
      const cnameOk = cnameChecks.every(Boolean);

      if (mxOk && cnameOk) {
        toast({ title: 'DNS verified', description: 'All records found. Validating with SendGrid...' });
        // Poll SendGrid validation for up to ~2 minutes
        const maxAttempts = 12;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          setRetryStatus(`Validating sender auth... attempt ${attempt}/${maxAttempts}`);
          const { data, error } = await supabase.functions.invoke('sendgrid-setup', {
            body: { ...values, action: 'validate' as const },
          });
          if (error) break;
          const isValid = !!(data?.sender_auth_valid || data?.validation?.valid);
          if (isValid) {
            toast({ title: 'Sender auth validated', description: 'Creating parse route now...' });
            const createAttempts = 6;
            for (let c = 1; c <= createAttempts; c++) {
              setRetryStatus(`Creating parse route... attempt ${c}/${createAttempts}`);
              const { data: createData, error: createErr } = await supabase.functions.invoke('sendgrid-setup', { body: values });
              if (createErr) break;
              if (createData?.ok) {
                setResult(createData);
                setDnsVerifiedButPending(false);
                await loadDomainAndInboxes(values.domain, values.parse_subdomain);
                toast({ title: 'Parse route created', description: 'MX is set and sender auth validated.' });
                return;
              }
              const msg = JSON.stringify(createData);
              if (!msg.includes('matching senderauth domain')) {
                break;
              }
              await new Promise((res) => setTimeout(res, 10000));
            }
            setDnsVerifiedButPending(true);
            return;
          }
          await new Promise((res) => setTimeout(res, 10000));
        }
        toast({ title: 'Still pending', description: 'SendGrid has not marked DNS as valid yet. Please wait a few minutes and try again.', variant: 'destructive' });
      } else {
        const missing: string[] = [];
        if (!mxOk) missing.push(`MX ${mxHost} -> mx.sendgrid.net`);
        cnameRecords.forEach((rec: any, i: number) => { if (!cnameChecks[i]) missing.push(`CNAME ${rec.host} -> ${rec.data}`); });
        toast({ title: 'DNS not ready', description: `Missing/invalid: ${missing.join(', ')}`, variant: 'destructive' });
      }
    } finally {
      setVerifying(false);
      setRetryStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency webhook fixer for hei@noddi.no */}
      <SendgridWebhookFixer />
      
      {/* SendGrid webhook testing */}
      <SendGridWebhookTester />
      
      <Card id="sendgrid-setup" className="bg-gradient-surface border-border/50 shadow-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <MailPlus className="w-5 h-5" />
          Email Domain Setup (SendGrid)
        </CardTitle>
        <CardDescription>
          Create an inbound parse route programmatically and get DNS records to add to your domain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="domain"
              rules={{ required: 'Domain is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="yourdomain.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parse_subdomain"
              rules={{ required: 'Parse subdomain is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parse subdomain</FormLabel>
                  <FormControl>
                    <Input placeholder="inbound" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-2 flex flex-col gap-2">
              <div className="flex gap-2">
                <Button type="submit" className="w-full sm:w-auto">Create Parse Route</Button>
                <Button type="button" variant="outline" onClick={verifyDns} className="w-full sm:w-auto" disabled={verifying}>{verifying ? 'Verifying...' : 'Verify DNS & Retry'}</Button>
              </div>
              {retryStatus && (
                <p className="text-sm text-muted-foreground animate-pulse">{retryStatus}</p>
              )}
              {dnsVerifiedButPending && !retryStatus && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                  ✅ DNS and sender auth are verified. SendGrid needs a few more minutes for internal propagation. Click <strong>Create Parse Route</strong> to try again.
                </div>
              )}
            </div>
          </form>
        </Form>

        {result && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Add this MX record to your DNS:</p>
              <div className="rounded-md border border-border/50 p-3 text-sm bg-background/50">
                <div className="flex gap-2"><span className="font-semibold">Host:</span><span>{result.hostname || `${form.getValues().parse_subdomain}.${form.getValues().domain}`}</span></div>
                <div className="flex gap-2"><span className="font-semibold">Type:</span><span>MX</span></div>
                <div className="flex gap-2"><span className="font-semibold">Value:</span><span>mx.sendgrid.net</span></div>
                <div className="flex gap-2"><span className="font-semibold">Priority:</span><span>10</span></div>
                <div className="flex gap-2"><span className="font-semibold">TTL:</span><span>3600</span></div>
              </div>
            </div>

            {(result?.dns_records?.sender_auth || result?.sender_auth?.record?.dns) && (
              <div>
                <p className="text-sm text-muted-foreground">Sender Authentication records (add these CNAMEs too):</p>
                <div className="rounded-md border border-border/50 p-3 text-xs bg-background/50 space-y-3">
                  {Object.values((result as any)?.dns_records?.sender_auth ?? (result as any)?.sender_auth?.record?.dns).map((rec: any) => (
                    <div key={rec.host} className="grid gap-1 sm:grid-cols-4">
                      <div className="flex gap-2 sm:col-span-2"><span className="font-semibold">Host:</span><span>{rec.host}</span></div>
                      <div className="flex gap-2"><span className="font-semibold">Type:</span><span>{(rec.type || 'CNAME').toUpperCase()}</span></div>
                      <div className="flex gap-2 sm:col-span-2"><span className="font-semibold">Value:</span><span className="break-all">{rec.data}</span></div>
                    </div>
                  ))}
                  <div className="text-muted-foreground">TTL: 3600 (or your default)</div>
                </div>
              </div>
            )}

            {result?.ok === false && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                We created the sender authentication config in SendGrid. Add the DNS records above, wait for propagation, then click "Create Parse Route" again.
              </div>
            )}
          </div>
        )}

        {result?.ok && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">Next: create an inbound address and map it to an inbox.</div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Alias</Label>
                <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="support" />
              </div>
              <div className="sm:col-span-2">
                <Label>Deliver to inbox</Label>
                <Select value={selectedInbox || ''} onValueChange={(v) => setSelectedInbox(v)}>
                  <SelectTrigger><SelectValue placeholder="Choose inbox" /></SelectTrigger>
                  <SelectContent>
                    {inboxes.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/50 p-3 bg-background/50 text-sm">
              <div>
                <div className="font-semibold">Receiving address</div>
                <div className="text-muted-foreground">{`${alias || 'your-alias'}@${form.getValues().parse_subdomain}.${form.getValues().domain}`}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" type="button" disabled={!alias.trim()} onClick={() => navigator.clipboard.writeText(`${alias}@${form.getValues().parse_subdomain}.${form.getValues().domain}`)}>Copy</Button>
                <Button type="button" disabled={!alias.trim() || !selectedInbox} onClick={createInboundRoute}>Create Inbound Address</Button>
              </div>
            </div>
            {route && (
              <div className="space-y-4">
                <div className="rounded-md border border-border/50 p-3 text-sm bg-background/50">
                  Send a test email to <span className="font-semibold">{route.address}</span>. Then set your public address to forward here.
                </div>
                <GoogleGroupSetup
                  alias={alias}
                  domain={form.getValues().domain}
                  parseSubdomain={form.getValues().parse_subdomain}
                  inboxName={inboxes.find((i: any) => i.id === selectedInbox)?.name}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};
