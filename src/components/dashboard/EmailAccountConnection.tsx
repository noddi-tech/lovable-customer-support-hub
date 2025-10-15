import { EmailForwarding } from "./EmailForwarding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { ConnectedEmailAccounts } from "@/components/dashboard/ConnectedEmailAccounts";

export function EmailAccountConnection() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Mail className="h-5 w-5" />
            Email Accounts & Forwarding
          </CardTitle>
          <CardDescription>
            Connect your email accounts via Gmail OAuth or set up email forwarding to receive emails in your inboxes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <EmailForwarding mode="gmailAndAccounts" />
          <ConnectedEmailAccounts />
        </CardContent>
      </Card>
    </div>
  );
}