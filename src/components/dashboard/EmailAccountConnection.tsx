import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from "@/components/admin/design/components/layouts";
import { EmailForwarding } from "./EmailForwarding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Forward, Server, Plus } from "lucide-react";
import { InboundRoutesList } from "@/components/admin/InboundRoutesList";
import { SendgridSetupWizard } from "@/components/admin/SendgridSetupWizard";
import { ConnectedEmailAccounts } from "@/components/dashboard/ConnectedEmailAccounts";

export function EmailAccountConnection() {
  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Mail className="h-5 w-5" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Connect your email accounts using our HelpScout-style approach: email forwarding for receiving emails and OAuth for sending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveTabs 
            defaultValue="forwarding" 
            variant="underline" 
            size="md" 
            equalWidth 
            className="w-full"
          >
            <ResponsiveTabsList className="bg-muted/50">
              <ResponsiveTabsTrigger value="forwarding" className="flex items-center gap-2">
                <Forward className="h-4 w-4" />
                Email Forwarding
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="add-alias" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Alias
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="inbound" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Inbound & Domain
              </ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            
            <ResponsiveTabsContent value="forwarding" className="mt-6">
              <EmailForwarding mode="gmailAndAccounts" />
            </ResponsiveTabsContent>
            
            <ResponsiveTabsContent value="add-alias" className="mt-6">
              <EmailForwarding mode="addAliasOnly" />
            </ResponsiveTabsContent>
            
            <ResponsiveTabsContent value="inbound" className="mt-6 space-y-6">
              <SendgridSetupWizard />
            </ResponsiveTabsContent>
          </ResponsiveTabs>

          <div className="mt-8 space-y-6">
            <ConnectedEmailAccounts />
            <InboundRoutesList />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}