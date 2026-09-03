import { AlertCircle, CheckCircle2, Copy, ExternalLink, Mail } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import type { SetupType } from "./SetupTypeSelector"

interface EmailConnectionStepProps {
  setupType: SetupType
  onEmailConnected?: (email: string) => void
  onSkip?: () => void
}

export function EmailConnectionStep({
  setupType,
  onEmailConnected,
  onSkip,
}: EmailConnectionStepProps) {
  const [groupEmail, setGroupEmail] = useState("")
  const [forwardingAddress, setForwardingAddress] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [existingAccountEmail, setExistingAccountEmail] = useState<string | null>(null)
  const popupOpenedAtRef = useRef<string | null>(null)
  const advancedRef = useRef(false)
  const { toast } = useToast()

  // Detect already-connected Gmail accounts when the step mounts.
  useEffect(() => {
    if (setupType !== "gmail") return
    let cancelled = false
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data } = await supabase
        .from("email_accounts")
        .select("email_address, created_at")
        .eq("user_id", user.id)
        .eq("provider", "gmail")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled && data?.email_address) {
        setExistingAccountEmail(data.email_address)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [setupType])

  // Look up the newest gmail account created after the popup opened.
  const checkForNewlyConnectedAccount = async (): Promise<string | null> => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const since = popupOpenedAtRef.current
    const query = supabase
      .from("email_accounts")
      .select("email_address, created_at")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
    const { data } = since
      ? await query.gte("created_at", since).maybeSingle()
      : await query.maybeSingle()
    return data?.email_address ?? null
  }

  const handleGmailConnect = async () => {
    try {
      setIsConnecting(true)
      advancedRef.current = false
      popupOpenedAtRef.current = new Date(Date.now() - 1000).toISOString()
      const { data, error } = await supabase.functions.invoke("gmail-oauth")

      if (error) {
        toast({
          title: "Error",
          description: "Failed to initiate Gmail connection",
          variant: "destructive",
        })
        setIsConnecting(false)
        return
      }

      const popup = window.open(data.authUrl, "gmail-auth", "width=500,height=600")

      if (!popup) {
        toast({
          title: "Error",
          description: "Popup blocked. Please allow popups and try again.",
          variant: "destructive",
        })
        setIsConnecting(false)
        return
      }

      const advance = (email: string) => {
        if (advancedRef.current) return
        advancedRef.current = true
        setExistingAccountEmail(email)
        onEmailConnected?.(email)
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "gmail_connected" && event.data?.email) {
          advance(event.data.email)
          window.removeEventListener("message", handleMessage)
        }
      }

      window.addEventListener("message", handleMessage)

      const checkClosed = setInterval(() => {
        void (async () => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener("message", handleMessage)
            setIsConnecting(false)

            // Fallback: postMessage may not have fired (e.g. browser blocked
            // the inline script). Verify against the database instead.
            if (!advancedRef.current) {
              const email = await checkForNewlyConnectedAccount()
              if (email) {
                advance(email)
                toast({
                  title: "Gmail connected",
                  description: `${email} is now linked.`,
                })
              } else {
                toast({
                  title: "Couldn't confirm connection",
                  description:
                    "If the Google window said it succeeded, refresh and check Integrations.",
                  variant: "destructive",
                })
              }
            }
          }
        })()
      }, 1000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect Gmail account",
        variant: "destructive",
      })
      setIsConnecting(false)
    }
  }

  const handleUseExisting = () => {
    if (existingAccountEmail) {
      onEmailConnected?.(existingAccountEmail)
    }
  }

  const generateForwardingAddress = () => {
    const randomId = Math.random().toString(36).substring(2, 8)
    return `inbox-${randomId}@parse.noddi.no`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: "Address copied to clipboard.",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the address manually.",
        variant: "destructive",
      })
    }
  }

  if (setupType === "gmail") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">📧 Connect Gmail Account</h3>
          <p className="text-sm text-muted-foreground">
            We'll open a secure Google sign-in window. After you sign in, emails from that account
            will automatically sync to your new inbox.
          </p>
        </div>

        {existingAccountEmail && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>
                <strong>{existingAccountEmail}</strong> is already connected.
              </span>
              <Button size="sm" variant="outline" onClick={handleUseExisting}>
                Use this account
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Button
            onClick={handleGmailConnect}
            disabled={isConnecting}
            size="lg"
            className="shadow-glow"
          >
            <Mail className="h-5 w-5 mr-2" />
            {isConnecting
              ? "Opening..."
              : existingAccountEmail
                ? "Connect a different account"
                : "Connect with Google"}
          </Button>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ℹ️ Auto-sync will check for new emails every 2 minutes (you can adjust this later in
            settings)
          </AlertDescription>
        </Alert>

        {onSkip && (
          <Button variant="ghost" onClick={onSkip} className="w-full">
            Skip for now
          </Button>
        )}
      </div>
    )
  }

  if (setupType === "google-group") {
    const forwarding = forwardingAddress || generateForwardingAddress()

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">📬 Connect Google Group</h3>
          <p className="text-sm text-muted-foreground">
            Enter your group email address and follow the steps to connect it
          </p>
        </div>

        <div>
          <Label htmlFor="group-email">Group Email Address</Label>
          <Input
            id="group-email"
            type="email"
            value={groupEmail}
            onChange={(e) => setGroupEmail(e.target.value)}
            placeholder="bedrift@noddi.no"
            className="mt-1.5"
          />
        </div>

        {groupEmail && (
          <div className="border-t pt-6">
            <h4 className="font-medium mb-4">📋 Follow these steps in Google Admin:</h4>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Open your group in Google Admin</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => window.open("https://admin.google.com/ac/groups", "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Open Google Admin
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Add this address as a member:</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input value={forwarding} readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(forwarding)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Set "Who can post" to "Anyone on the web"</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This allows the forwarding address to deliver messages to your inbox
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Send a test email to {groupEmail}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verify that emails arrive in your inbox within a few minutes
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // team-email
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">📬 Set Up Email Forwarding</h3>
        <p className="text-sm text-muted-foreground">
          Configure your email to forward to our system
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Go to Admin → Integrations to complete the email forwarding setup after creating the
          inbox.
        </AlertDescription>
      </Alert>

      {onSkip && (
        <Button variant="outline" onClick={onSkip} className="w-full">
          Continue to next step
        </Button>
      )}
    </div>
  )
}
