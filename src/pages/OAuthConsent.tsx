import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

/**
 * Supabase OAuth 2.1 consent screen, routed at /.lovable/oauth/consent.
 * Supabase redirects the user here to approve or deny an MCP client
 * (ChatGPT, Claude, Cursor, ...) that wants to act as them in this app.
 */

// The supabase.auth.oauth namespace is beta and not in the generated types yet.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};

const oauthApi = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id in the URL.");
        return;
      }

      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the FULL consent URL so auth returns the user here.
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }

      const { data, error: detailsError } = await oauthApi().getAuthorizationDetails(authorizationId);
      if (!active) return;

      if (detailsError) {
        setError(detailsError.message);
        return;
      }

      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }

      setDetails(data);
    })();

    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);

    const { data, error: decisionError } = approve
      ? await oauthApi().approveAuthorization(authorizationId)
      : await oauthApi().denyAuthorization(authorizationId);

    if (decisionError) {
      setBusy(false);
      setError(decisionError.message);
      return;
    }

    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }

    window.location.href = target;
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <CardTitle>Authorization failed</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This request may have expired. Start the connection again from the app you were
              connecting.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading authorization request…</span>
        </div>
      </main>
    );
  }

  const clientName = details.client?.name ?? "An application";

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <CardTitle>Connect {clientName}</CardTitle>
          <CardDescription>
            {clientName} is asking to access your customer support hub account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md border bg-background p-4 text-sm">
            <p className="mb-2 font-medium">This will let it:</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>Search and read conversations you have access to</li>
              <li>Read customer details on those conversations</li>
              <li>Add internal notes as you</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            It acts as you, and only sees data your account is already allowed to see. You can
            revoke this access at any time.
          </p>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => decide(false)}>
              Deny
            </Button>
            <Button className="flex-1" disabled={busy} onClick={() => decide(true)}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
