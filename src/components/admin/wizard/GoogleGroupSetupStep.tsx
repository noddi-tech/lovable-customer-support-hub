import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import { useDomainConfiguration } from "@/hooks/useDomainConfiguration";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GoogleGroupSetupStepProps {
  publicEmail: string;
  forwardingAddress: string;
  onPublicEmailChange: (email: string) => void;
  onForwardingAddressGenerated: (address: string) => void;
  onInboundRouteCreated: (routeId: string) => void;
  onSetupComplete: () => void;
}

export function GoogleGroupSetupStep({
  publicEmail,
  forwardingAddress,
  onPublicEmailChange,
  onForwardingAddressGenerated,
  onInboundRouteCreated,
  onSetupComplete,
}: GoogleGroupSetupStepProps) {
  const [isCreatingRoute, setIsCreatingRoute] = useState(false);
  const [routeCreated, setRouteCreated] = useState(false);
  const [step1Done, setStep1Done] = useState(false);
  const [step2Done, setStep2Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  const { 
    getConfiguredDomain, 
    getDomainByName,
    generateForwardingAddress, 
    extractDomainFromEmail,
    isDomainConfigured,
    isLoading: domainsLoading 
  } = useDomainConfiguration();

  const emailDomain = extractDomainFromEmail(publicEmail);
  const matchingDomain = emailDomain ? getDomainByName(emailDomain) : null;
  const configuredDomain = matchingDomain || getConfiguredDomain();
  const domainConfigured = emailDomain ? isDomainConfigured(emailDomain) : false;

  // Generate forwarding address when email changes
  useEffect(() => {
    if (publicEmail && publicEmail.includes('@')) {
      const generated = generateForwardingAddress(publicEmail, configuredDomain);
      onForwardingAddressGenerated(generated);
    }
  }, [publicEmail, configuredDomain]);

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

      // Get or use the configured domain
      const domain = configuredDomain;
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
      setShowInstructions(true);
      toast.success("Forwarding route created!");
    } catch (error: any) {
      console.error('Failed to create inbound route:', error);
      toast.error(error.message || "Failed to create route");
    } finally {
      setIsCreatingRoute(false);
    }
  };

  const allStepsDone = step1Done && step2Done && step3Done;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">📬 Connect Google Group</h3>
        <p className="text-sm text-muted-foreground">
          Enter your public email address and we'll set up email forwarding
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
      {publicEmail && emailDomain && !domainsLoading && (
        <Alert className={configuredDomain ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}>
          {configuredDomain ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertCircle className="h-4 w-4 text-warning" />
          )}
          <AlertDescription>
            {configuredDomain ? (
              <span>Domain <strong>{configuredDomain.domain}</strong> is configured and ready!</span>
            ) : (
              <span>Domain configuration required. Contact support to set up {emailDomain}.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Forwarding Address Preview */}
      {publicEmail && forwardingAddress && configuredDomain && (
        <div className="space-y-2">
          <Label>Your forwarding address</Label>
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
          <p className="text-xs text-muted-foreground">
            Emails sent to {publicEmail} will be forwarded to this address
          </p>
        </div>
      )}

      {/* Create Route Button */}
      {publicEmail && forwardingAddress && configuredDomain && !routeCreated && (
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
        <Alert className="border-success/50 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertDescription>
            Forwarding route created! Now complete the Google Admin setup below.
          </AlertDescription>
        </Alert>
      )}

      {/* Google Admin Instructions */}
      {routeCreated && (
        <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>📋 Google Admin Setup Instructions</span>
              {showInstructions ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setStep1Done(!step1Done)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step1Done 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {step1Done ? '✓' : '1'}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Open your group in Google Admin</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your Google Group ({publicEmail}) in the admin console
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      window.open('https://admin.google.com/ac/groups', '_blank');
                      setStep1Done(true);
                    }}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Open Google Admin
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setStep2Done(!step2Done)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step2Done 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {step2Done ? '✓' : '2'}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Add this address as a group member</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In your group's Members section, add this email:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      value={forwardingAddress}
                      readOnly
                      className="font-mono text-xs bg-background"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        copyToClipboard(forwardingAddress);
                        setStep2Done(true);
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setStep3Done(!step3Done)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step3Done 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {step3Done ? '✓' : '3'}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium">Allow external senders</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    In your group's Settings → Access Settings, set "Who can post" to <strong>"Anyone on the web"</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This ensures emails from customers reach your inbox
                  </p>
                </div>
              </div>

              {/* Test Email Prompt */}
              {allStepsDone && (
                <Alert className="border-primary/50 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <strong>Test your setup!</strong> Send an email to <strong>{publicEmail}</strong> and verify it arrives in your inbox within a few minutes.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Continue Button */}
      {routeCreated && (
        <Button
          onClick={onSetupComplete}
          className="w-full"
          variant={allStepsDone ? "default" : "outline"}
        >
          {allStepsDone ? "Continue to Inbox Assignment" : "Skip Instructions & Continue"}
        </Button>
      )}
    </div>
  );
}
