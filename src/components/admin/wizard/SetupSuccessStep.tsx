import { CheckCircle2, Mail, Send, AlertCircle, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { SetupType } from "./SetupTypeSelector";

interface SetupSuccessStepProps {
  setupType: SetupType;
  connectedEmail?: string;
  forwardingAddress?: string;
  assignmentMode: 'existing' | 'new' | 'skip';
  inboxName?: string;
  inboxColor?: string;
  onGoToInbox: () => void;
  onSetupAnother: () => void;
}

export function SetupSuccessStep({
  setupType,
  connectedEmail,
  forwardingAddress,
  assignmentMode,
  inboxName,
  inboxColor,
  onGoToInbox,
  onSetupAnother
}: SetupSuccessStepProps) {
  const getSetupTypeLabel = () => {
    switch (setupType) {
      case 'gmail':
        return 'Gmail OAuth';
      case 'google-group':
        return 'Google Group';
      case 'team-email':
        return 'Email Forwarding';
    }
  };

  const getAssignmentLabel = () => {
    if (assignmentMode === 'skip') return 'Not assigned yet';
    if (assignmentMode === 'new' && inboxName) return inboxName;
    return 'Assigned to existing inbox';
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Email Integration Created!</h3>
        <p className="text-muted-foreground">
          {connectedEmail 
            ? `Successfully connected ${connectedEmail}`
            : 'Your email integration is ready'
          }
        </p>
      </div>

      <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
        <h4 className="font-semibold mb-3">Setup Summary:</h4>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[140px]">Integration Type:</span>
            <span className="font-medium">{getSetupTypeLabel()}</span>
          </div>
          
          {connectedEmail && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[140px]">Public Email:</span>
              <span>{connectedEmail}</span>
            </div>
          )}

          {forwardingAddress && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground min-w-[140px]">Forwarding Address:</span>
              <div className="flex-1 flex items-center gap-2">
                <Input
                  value={forwardingAddress}
                  readOnly
                  className="font-mono text-xs h-8 bg-background"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(forwardingAddress)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[140px]">Inbox Assignment:</span>
            <div className="flex items-center gap-2">
              {inboxColor && (
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: inboxColor }}
                />
              )}
              <span>{getAssignmentLabel()}</span>
            </div>
          </div>
        </div>
      </div>

      {assignmentMode !== 'skip' && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Test Your Setup</p>
              <p className="text-sm text-muted-foreground">
                {setupType === 'gmail' 
                  ? 'Emails will be synced automatically every 2 minutes. You can manually sync from the inbox view.'
                  : connectedEmail
                    ? `Send a test email to ${connectedEmail} to verify that messages arrive in your inbox within a few minutes.`
                    : 'Send a test email to verify that messages arrive in your inbox within a few minutes.'
                }
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {assignmentMode === 'skip' && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Remember to assign this integration to an inbox from Admin → Integrations before emails will be synced.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 pt-4">
        {assignmentMode !== 'skip' && (
          <Button onClick={onGoToInbox} className="flex-1">
            <Send className="h-4 w-4 mr-2" />
            Go to Inbox
          </Button>
        )}
        <Button onClick={onSetupAnother} variant="outline" className={assignmentMode === 'skip' ? 'w-full' : 'flex-1'}>
          Add Another Integration
        </Button>
      </div>
    </div>
  );
}
