import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

interface GoogleGroupSetupProps {
  alias: string;
  domain: string;
  parseSubdomain: string;
  inboxName?: string;
}

export const GoogleGroupSetup = ({ alias, domain, parseSubdomain, inboxName }: GoogleGroupSetupProps) => {
  const groupAddress = `${alias}@${domain}`;
  const forwardingTarget = `${alias}@${parseSubdomain}.${domain}`;
  const [markedDone, setMarkedDone] = useState(false);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Set up Google Group forwarding</h3>
        <p className="text-sm text-muted-foreground">Deliver emails sent to your public address directly into your inbox in this app.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border/50 p-3 bg-background/50">
          <Label className="text-xs">Group email (public)</Label>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="font-mono text-sm break-all">{groupAddress}</div>
            <Button variant="outline" size="sm" type="button" onClick={() => copy(groupAddress)}>Copy</Button>
          </div>
        </div>
        <div className="rounded-md border border-border/50 p-3 bg-background/50">
          <Label className="text-xs">Forward to (receiving address)</Label>
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="font-mono text-sm break-all">{forwardingTarget}</div>
            <Button variant="outline" size="sm" type="button" onClick={() => copy(forwardingTarget)}>Copy</Button>
          </div>
        </div>
      </div>

      <Separator />

      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>Open Google Admin: Groups → Create or select <span className="font-medium">{groupAddress}</span>.</li>
        <li>Allow external senders to post to the group (Who can post: Anyone on the web).</li>
        <li>Add a member: <span className="font-medium">{forwardingTarget}</span> so all messages are delivered to it.</li>
        <li>Optional: Disable moderation and footers to avoid delivery delays.</li>
        <li>Send a test email to <span className="font-medium">{groupAddress}</span>. It should appear in{inboxName ? ` the "${inboxName}" inbox` : ' your selected inbox'} within seconds.</li>
      </ol>

      <div className="flex flex-wrap gap-2">
        <a
          href="https://admin.google.com/ac/groups"
          target="_blank"
          rel="noreferrer"
          className="inline-flex"
        >
          <Button variant="secondary" type="button">Open Google Admin</Button>
        </a>
        <Button type="button" onClick={() => setMarkedDone(true)}>{markedDone ? 'Marked as configured' : 'Mark as configured'}</Button>
      </div>

      {markedDone && (
        <div className="rounded-md border border-border/50 p-3 text-sm bg-background/50">
          Great! Now send an email to <span className="font-medium">{groupAddress}</span> to confirm delivery.
        </div>
      )}
    </section>
  );
};
