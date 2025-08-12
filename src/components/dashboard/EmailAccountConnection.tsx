import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailForwarding } from "./EmailForwarding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Forward, Server, Plus } from "lucide-react";
import { InboundRoutesList } from "@/components/admin/InboundRoutesList";
import { SendgridSetupWizard } from "@/components/admin/SendgridSetupWizard";

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
          <Tabs defaultValue="forwarding" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger value="forwarding" className="flex items-center gap-2">
                <Forward className="h-4 w-4" />
                Email Forwarding
              </TabsTrigger>
              <TabsTrigger value="add-alias" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Alias
              </TabsTrigger>
              <TabsTrigger value="inbound" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Inbound & Domain
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="forwarding" className="mt-6">
              <EmailForwarding mode="gmailAndAccounts" />
            </TabsContent>
            
            <TabsContent value="add-alias" className="mt-6">
              <EmailForwarding mode="addAliasOnly" />
            </TabsContent>
            
            <TabsContent value="inbound" className="mt-6 space-y-6">
              <InboundRoutesList />
              <SendgridSetupWizard />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}