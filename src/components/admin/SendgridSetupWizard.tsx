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
    toast({ title: 'Parse route created', description: 'Add the MX record to your DNS and we will verify automatically.' });
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
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full sm:w-auto">Create Parse Route</Button>
            </div>
          </form>
        </Form>

        {result && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Add this MX record to your DNS:</p>
            <div className="rounded-md border border-border/50 p-3 text-sm bg-background/50">
              <div className="flex gap-2"><span className="font-semibold">Host:</span><span>{result.hostname}</span></div>
              <div className="flex gap-2"><span className="font-semibold">Type:</span><span>MX</span></div>
              <div className="flex gap-2"><span className="font-semibold">Value:</span><span>mx.sendgrid.net</span></div>
              <div className="flex gap-2"><span className="font-semibold">Priority:</span><span>10</span></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
