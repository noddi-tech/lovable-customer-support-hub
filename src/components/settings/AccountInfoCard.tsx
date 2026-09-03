import { Loader2 } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/useAuth"
import { useDateFormatting } from "@/hooks/useDateFormatting"
import { supabase } from "@/integrations/supabase/client"
import { getActiveRoles } from "@/lib/auth-scope"

type ProviderKey = "google" | "custom:navio"

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  google: "Google",
  "custom:navio": "Navio (product IdP)",
}

const PROVIDER_CAPABILITIES: Record<ProviderKey, string> = {
  google: "Workspace sign-in. Verifies identity and email only — no roles or organizations.",
  "custom:navio":
    "Product IdP. Supplies roles, organizations and service departments as token claims.",
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin:
    "Full platform access across every organization, including admin portal and system settings.",
  admin: "Manage users, inboxes, settings and all conversations within your organizations.",
  agent: "Handle conversations, calls and customers in the inboxes you have access to.",
  user: "Read-only or limited access to the inboxes you are a member of.",
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words font-medium">{children}</span>
  </div>
)

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({
  title,
  hint,
  children,
}) => (
  <section className="space-y-2">
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
    {children}
  </section>
)

export const AccountInfoCard: React.FC = () => {
  const {
    user,
    profile,
    role,
    navioClaims,
    accessibleOrganizations,
    accessibleServiceDepartments,
    memberships,
    effectiveScope,
  } = useAuth()
  const { dateTime } = useDateFormatting()
  const { toast } = useToast()
  const [busyProvider, setBusyProvider] = useState<string | null>(null)

  const identities = useMemo(
    () =>
      (user?.identities || []) as Array<{
        id: string
        provider: string
        identity_data?: Record<string, any>
      }>,
    [user?.identities],
  )
  const connectedProviders = useMemo(() => new Set(identities.map((i) => i.provider)), [identities])
  const currentProvider = (user?.app_metadata as any)?.provider as string | undefined

  const claimRoles = useMemo(() => getActiveRoles(navioClaims as any) || [], [navioClaims])

  const userType =
    (user?.app_metadata as any)?.user_type ||
    (user?.user_metadata as any)?.user_type ||
    (connectedProviders.has("custom:navio")
      ? "navio_team"
      : connectedProviders.has("google")
        ? "google_workspace"
        : "user")

  const handleLink = async (provider: ProviderKey) => {
    setBusyProvider(provider)
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: provider,
        options: { redirectTo: `${window.location.origin}/auth` },
      })
      if (error) throw error
    } catch (e: any) {
      toast({
        title: "Could not connect sign-in method",
        description: e?.message || "Identity linking is not enabled for this project.",
        variant: "destructive",
      })
      setBusyProvider(null)
    }
  }

  const handleUnlink = async (provider: string) => {
    const identity = identities.find((i) => i.provider === provider)
    if (!identity) return
    setBusyProvider(provider)
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity as any)
      if (error) throw error
      toast({
        title: "Disconnected",
        description: `${PROVIDER_LABELS[provider as ProviderKey] || provider} was disconnected.`,
      })
    } catch (e: any) {
      toast({
        title: "Could not disconnect",
        description: e?.message || "You must keep at least one sign-in method.",
        variant: "destructive",
      })
    } finally {
      setBusyProvider(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account & access</CardTitle>
        <CardDescription>
          Sign-in methods and the permissions this account has in Support Hub.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Section title="Session">
          <div>
            <Row label="User type">
              <Badge variant="secondary" className="font-mono text-[11px]">
                {userType}
              </Badge>
            </Row>
            <Row label="User ID">
              <span className="font-mono text-xs">{user?.id || "—"}</span>
            </Row>
            <Row label="Last sign-in">
              {user?.last_sign_in_at ? dateTime(new Date(user.last_sign_in_at)) : "—"}
            </Row>
          </div>
        </Section>

        <Separator />

        <Section
          title="Sign-in methods"
          hint="Connect several identity providers to the same account. Each one can sign you in, but only Navio supplies roles and organizations."
        >
          <div className="space-y-2">
            {(Object.keys(PROVIDER_LABELS) as ProviderKey[]).map((provider) => {
              const identity = identities.find((i) => i.provider === provider)
              const isConnected = !!identity
              const isBusy = busyProvider === provider
              const isOnlyIdentity = isConnected && identities.length <= 1
              return (
                <div
                  key={provider}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{PROVIDER_LABELS[provider]}</span>
                      {isConnected ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">
                          Not connected
                        </Badge>
                      )}
                      {provider === currentProvider && (
                        <Badge className="text-[10px]">Used this session</Badge>
                      )}
                    </div>
                    <p className="break-words text-xs text-muted-foreground">
                      {isConnected && (
                        <>
                          {(identity?.identity_data?.email as string) || user?.email || "—"}
                          {" · "}
                        </>
                      )}
                      {PROVIDER_CAPABILITIES[provider]}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={isConnected ? "outline" : "default"}
                    disabled={isBusy || isOnlyIdentity}
                    onClick={() => (isConnected ? handleUnlink(provider) : handleLink(provider))}
                    title={isOnlyIdentity ? "You must keep at least one sign-in method" : undefined}
                  >
                    {isBusy && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    {isConnected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              )
            })}
          </div>
        </Section>

        <Separator />

        <Section
          title="Access from IdP"
          hint="Roles and scope delivered in the sign-in token, before Support Hub applies its own rules."
        >
          {claimRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organization claims from external sign-in. Sign in with Navio to pull roles and
              departments from the IdP.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {claimRoles.map((r: string) => (
                <Badge key={r} variant="secondary" className="font-mono text-[11px]">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </Section>

        <Separator />

        <Section
          title="Access in Support Hub"
          hint="Effective permissions for this account in this product."
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="font-mono text-[11px]">
              {role}
            </Badge>
            {effectiveScope?.isSuperuser && <Badge>All organizations</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {ROLE_DESCRIPTIONS[role as string] ||
              "Access is limited to the inboxes and organizations you are a member of."}
          </p>
          <p className="text-sm text-muted-foreground">
            {accessibleOrganizations?.length ?? 0} organization(s) ·{" "}
            {accessibleServiceDepartments?.length ?? 0} department(s) visible
            {memberships?.length ? ` via ${memberships.length} membership(s).` : "."}
          </p>
          {(accessibleOrganizations?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {accessibleOrganizations.slice(0, 12).map((o) => (
                <Badge
                  key={o.navioId ?? o.localId ?? o.name}
                  variant="outline"
                  className="text-[11px]"
                >
                  {o.name}
                </Badge>
              ))}
              {accessibleOrganizations.length > 12 && (
                <Badge variant="outline" className="text-[11px]">
                  +{accessibleOrganizations.length - 12} more
                </Badge>
              )}
            </div>
          )}
          {(accessibleServiceDepartments?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {accessibleServiceDepartments.slice(0, 12).map((d) => (
                <Badge
                  key={d.navioId ?? d.localId ?? d.name}
                  variant="secondary"
                  className="text-[11px]"
                >
                  {d.name}
                </Badge>
              ))}
              {accessibleServiceDepartments.length > 12 && (
                <Badge variant="secondary" className="text-[11px]">
                  +{accessibleServiceDepartments.length - 12} more
                </Badge>
              )}
            </div>
          )}
        </Section>
      </CardContent>
    </Card>
  )
}

export default AccountInfoCard
