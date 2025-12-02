import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDomainConfiguration } from "@/hooks/useDomainConfiguration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmailForwardingSetupStepProps {
  publicEmail: string;
  forwardingAddress: string;
  onPublicEmailChange: (email: string) => void;
  onForwardingAddressGenerated: (address: string) => void;
  onInboundRouteCreated: (routeId: string) => void;
  onSetupComplete: () => void;
}

export function EmailForwardingSetupStep({
  publicEmail,
  forwardingAddress,
  onPublicEmailChange,
  onForwardingAddressGenerated,
  onInboundRouteCreated,
  onSetupComplete,
}: EmailForwardingSetupStepProps) {
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routeCreated, setRouteCreated] = useState(false);
  
  const { 
    getActiveDomain, 
    generateForwardingAddress, 
    isLoading: domainsLoading 
  } = useDomainConfiguration();

  const activeDomain = getActiveDomain();

  // Generate forwarding address when email changes
  useEffect(() => {
    if (publicEmail && publicEmail.includes('@')) {
      const generated = generateForwardingAddress(publicEmail, activeDomain);
      onForwardingAddressGenerated(generated);
    }
  }, [publicEmail, activeDomain]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy. Please copy manually.");
    }
  };

  const createInboundRoute = async () => {
    if (!publicEmail || !forwardingAddress) return;
    
    setIsCreatingRoute(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      const domain = activeDomain;
      if (!domain) throw new Error('No configured domain found');

      const localPart = publicEmail.split('@')[0];

      // Check if route already exists
      const { data: existingRoute } = await supabase
        .from('inbound_routes')
        .select('id')
        .eq('address', forwardingAddress)
        .eq('organization_id', profile.organization_id)
        .single();

      if (existingRoute) {
        onInboundRouteCreated(existingRoute.id);
        setRouteCreated(true);
        toast.success("Route already exists!");
        return;
      }

      // Create new inbound route
      const { data: newRoute, error } = await supabase
        .from('inbound_routes')
        .insert({
          address: forwardingAddress,
          alias_local_part: localPart,
          domain_id: domain.id,
          organization_id: profile.organization_id,
          group_email: publicEmail,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      onInboundRouteCreated(newRoute.id);
      setRouteCreated(true);
      toast.success("Forwarding route created!");
    } catch (error: any) {
      console.error('Failed to create inbound route:', error);
      toast.error(error.message || "Failed to create route");
    } finally {
      setIsCreatingRoute(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">📬 Set Up Email Forwarding</h3>
        <p className="text-sm text-muted-foreground">
          Forward emails from any email provider to your inbox
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="public-email">Your public email address</Label>
        <Input
          id="public-email"
          type="email"
          value={publicEmail}
          onChange={(e) => onPublicEmailChange(e.target.value)}
          placeholder="support@yourcompany.com"
          disabled={routeCreated}
        />
        <p className="text-xs text-muted-foreground">
          This is the email your customers send messages to
        </p>
      </div>

      {/* Domain Status */}
      {publicEmail && !domainsLoading && (
        <Alert className={activeDomain ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}>
          {activeDomain ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-warning" />
          )}
          <AlertDescription>
            {activeDomain ? (
              <span>Email forwarding is ready! Domain <strong>{activeDomain.domain}</strong> is configured.</span>
            ) : (
              <span>Domain configuration required. Contact support to set up email forwarding.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Forwarding Address Preview */}
      {publicEmail && forwardingAddress && activeDomain && (
        <div className="space-y-2">
          <Label>Forward emails to this address</Label>
          <div className="flex items-center gap-2">
            <Input
              value={forwardingAddress}
              readOnly
              className="font-mono text-sm bg-muted"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(forwardingAddress)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create Route Button */}
      {publicEmail && forwardingAddress && activeDomain && !routeCreated && (
        <Button
          onClick={createInboundRoute}
          disabled={isCreatingRoute}
          className="w-full"
        >
          {isCreatingRoute ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            "Set Up Forwarding Route"
          )}
        </Button>
      )}

      {/* Route Created Success */}
      {routeCreated && (
        <>
          <Alert className="border-success/50 bg-success/5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription>
              Forwarding route created! Now set up forwarding in your email provider.
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">📋 Configure your email provider:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Log into your email provider's settings</li>
              <li>Find "Forwarding" or "Email routing" settings</li>
              <li>Add this forwarding address:</li>
            </ol>
            <div className="flex items-center gap-2">
              <Input
                value={forwardingAddress}
                readOnly
                className="font-mono text-xs bg-background"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(forwardingAddress)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <ol start={4} className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Save and test by sending an email to {publicEmail}</li>
            </ol>
          </div>

          <Button onClick={onSetupComplete} className="w-full">
            Continue to Inbox Assignment
          </Button>
        </>
      )}
    </div>
  );
}
