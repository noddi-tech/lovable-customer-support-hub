import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface DnsRecordsDisplayProps {
  dnsRecords: any;
  sendgridResult: any;
}

export function DnsRecordsDisplay({ dnsRecords, sendgridResult }: DnsRecordsDisplayProps) {
  const senderAuth = dnsRecords?.sender_auth || sendgridResult?.sender_auth?.record?.dns;

  return (
    <div className="space-y-4">
      {/* MX Record */}
      {dnsRecords?.mx && (
        <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
          <p className="text-sm font-medium">📌 Add this MX record to your DNS:</p>
          {dnsRecords.mx.map((rec: any, i: number) => (
            <div key={i} className="rounded-md border border-border/50 p-3 text-sm bg-background/50">
              <div className="flex gap-2"><span className="font-semibold">Host:</span><span>{rec.host}</span></div>
              <div className="flex gap-2"><span className="font-semibold">Type:</span><span>MX</span></div>
              <div className="flex gap-2"><span className="font-semibold">Value:</span><span>{rec.value}</span></div>
              <div className="flex gap-2"><span className="font-semibold">Priority:</span><span>{rec.priority}</span></div>
            </div>
          ))}
        </div>
      )}

      {/* Sender Auth CNAME Records */}
      {senderAuth && (
        <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
          <p className="text-sm font-medium">📌 Add these CNAME records for sender authentication:</p>
          <div className="rounded-md border border-border/50 p-3 text-xs bg-background/50 space-y-3">
            {Object.values(senderAuth).map((rec: any) => (
              <div key={rec.host} className="grid gap-1 sm:grid-cols-3">
                <div className="flex gap-2 sm:col-span-2">
                  <span className="font-semibold">Host:</span>
                  <span className="break-all">{rec.host}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold">Type:</span>
                  <span>{(rec.type || 'CNAME').toUpperCase()}</span>
                </div>
                <div className="flex gap-2 sm:col-span-3">
                  <span className="font-semibold">Value:</span>
                  <span className="break-all">{rec.data}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning if setup wasn't fully successful */}
      {sendgridResult?.ok === false && (
        <Alert className="border-warning/50 bg-warning/5">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription>
            Domain requires DNS configuration before emails will be received. Add the records above to your DNS provider, wait for propagation, then verify in the SendGrid setup section.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
