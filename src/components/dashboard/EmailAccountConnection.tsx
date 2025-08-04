import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailForwarding } from "./EmailForwarding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Forward, Send } from "lucide-react";

export function EmailAccountConnection() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Integration
          </CardTitle>
          <CardDescription>
            Connect your email accounts using our HelpScout-style approach: email forwarding for receiving emails and OAuth for sending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="forwarding" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="forwarding" className="flex items-center gap-2">
                <Forward className="h-4 w-4" />
                Email Forwarding
              </TabsTrigger>
              <TabsTrigger value="sending" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Sending Setup
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="forwarding" className="mt-6">
              <EmailForwarding />
            </TabsContent>
            
            <TabsContent value="sending" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5" />
                    Gmail OAuth for Sending
                  </CardTitle>
                  <CardDescription>
                    Set up OAuth to send emails through your Gmail account. This is only needed when replying to customers.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">How it works:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>1. Connect your Gmail account for sending emails</li>
                        <li>2. When you reply to customers, we'll send through your Gmail</li>
                        <li>3. Customers see emails coming from your actual email address</li>
                        <li>4. Much simpler than traditional SMTP setup</li>
                      </ul>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      You'll set up Gmail OAuth when you're ready to send your first reply. No need to configure this until then.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}