import { CheckCircle2, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { SetupType } from "./SetupTypeSelector";

interface SetupSuccessStepProps {
  inboxName: string;
  inboxColor: string;
  setupType: SetupType;
  connectedEmail?: string;
  onGoToInbox: () => void;
  onSetupAnother: () => void;
}

export function SetupSuccessStep({
  inboxName,
  inboxColor,
  setupType,
  connectedEmail,
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
      case 'just-inbox':
        return 'Inbox Only';
    }
  };

  const getEmailStatus = () => {
    if (setupType === 'just-inbox') {
      return 'No email connected yet';
    }
    if (connectedEmail) {
      return connectedEmail;
    }
    return 'Configuration in progress';
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-4">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-2xl font-bold mb-2">✅ Inbox Created Successfully!</h3>
        <p className="text-muted-foreground">
          Your "{inboxName}" inbox is ready to receive emails
        </p>
      </div>

      <div className="border rounded-lg p-6 space-y-4 bg-muted/30">
        <h4 className="font-semibold mb-3">📊 Setup Summary:</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[100px]">Inbox:</span>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: inboxColor }}
              />
              <span className="font-medium">{inboxName}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[100px]">Setup Type:</span>
            <span>{getSetupTypeLabel()}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[100px]">Email:</span>
            <span>{getEmailStatus()}</span>
          </div>
        </div>
      </div>

      {setupType !== 'just-inbox' && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">🧪 Test Your Setup</p>
              <p className="text-sm text-muted-foreground">
                {setupType === 'gmail' 
                  ? 'Emails will be synced automatically every 2 minutes. You can manually sync from the inbox view.'
                  : 'Send a test email to verify that messages arrive in your inbox within a few minutes.'
                }
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 pt-4">
        <Button onClick={onGoToInbox} className="flex-1">
          <Send className="h-4 w-4 mr-2" />
          Go to Inbox
        </Button>
        <Button onClick={onSetupAnother} variant="outline" className="flex-1">
          Set Up Another
        </Button>
      </div>
    </div>
  );
}
