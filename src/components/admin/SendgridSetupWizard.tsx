import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MailPlus } from 'lucide-react';

interface SetupFormValues {
  domain: string;
  parse_subdomain: string;
}

export const SendgridSetupWizard = () => {
  const { toast } = useToast();
  const [result, setResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const form = useForm<SetupFormValues>({
    defaultValues: { domain: '', parse_subdomain: 'inbound' },
  });

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
        toast({ title: 'DNS verified', description: 'All records found. Retrying parse route creation...' });
        await onSubmit(values);
      } else {
        const missing: string[] = [];
        if (!mxOk) missing.push(`MX ${mxHost} -> mx.sendgrid.net`);
        cnameRecords.forEach((rec: any, i: number) => { if (!cnameChecks[i]) missing.push(`CNAME ${rec.host} -> ${rec.data}`); });
        toast({ title: 'DNS not ready', description: `Missing/invalid: ${missing.join(', ')}`, variant: 'destructive' });
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Card className="bg-gradient-surface border-border/50 shadow-surface">
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
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" className="w-full sm:w-auto">Create Parse Route</Button>
              <Button type="button" variant="outline" onClick={verifyDns} className="w-full sm:w-auto" disabled={verifying}>Verify DNS & Retry</Button>
            </div>
          </form>
        </Form>

        {result && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Add this MX record to your DNS:</p>
              <div className="rounded-md border border-border/50 p-3 text-sm bg-background/50">
                <div className="flex gap-2"><span className="font-semibold">Host:</span><span>{result.hostname}</span></div>
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
      </CardContent>
    </Card>
  );
};
