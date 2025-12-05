import { EmailForwarding } from "./EmailForwarding";
import { ConnectedEmailAccountsContent } from "@/components/dashboard/ConnectedEmailAccounts";
import { Separator } from "@/components/ui/separator";

// Legacy wrapper component for backwards compatibility
export function EmailAccountConnection() {
  return (
    <div className="space-y-6">
      <EmailForwarding mode="gmailAndAccounts" />
      <Separator />
      <ConnectedEmailAccountsContent />
    </div>
  );
}
