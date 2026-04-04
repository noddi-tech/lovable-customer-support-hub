import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Recipient } from "./RecipientReview";

interface SendConfirmationProps {
  recipients: Recipient[];
  subject: string;
  messageTemplate: string;
  onSend: () => void;
  isSending: boolean;
  sendResult: {
    sent_count: number;
    failed_count: number;
  } | null;
}

export function SendConfirmation({
  recipients,
  subject,
  messageTemplate,
  onSend,
  isSending,
  sendResult,
}: SendConfirmationProps) {
  const selected = recipients.filter((r) => r.selected);

  if (sendResult) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border bg-muted/50 p-6 text-center space-y-3">
          {sendResult.failed_count === 0 ? (
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
          ) : (
            <AlertCircle className="h-12 w-12 text-accent mx-auto" />
          )}
          <h3 className="text-lg font-semibold">Bulk Send Complete</h3>
          <div className="flex justify-center gap-6 text-sm">
            <span className="text-primary font-medium">
              ✓ {sendResult.sent_count} sent
            </span>
            {sendResult.failed_count > 0 && (
              <span className="text-destructive font-medium">
                ✗ {sendResult.failed_count} failed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Individual conversations have been created in your inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 space-y-3">
        <h3 className="font-medium">Send Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">Recipients:</span>
          <span className="font-medium">{selected.length} customers</span>
          <span className="text-muted-foreground">Subject:</span>
          <span className="font-medium">{subject}</span>
          <span className="text-muted-foreground">Method:</span>
          <span className="font-medium">Individual email conversations</span>
        </div>
      </div>

      {isSending && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Sending emails...</p>
          <Progress value={undefined} className="h-2" />
        </div>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={onSend}
        disabled={isSending || selected.length === 0}
      >
        {isSending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        {isSending ? "Sending..." : `Send to ${selected.length} Customers`}
      </Button>
    </div>
  );
}
