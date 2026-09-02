import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { getActiveRoles } from '@/lib/auth-scope';
import { Loader2 } from 'lucide-react';

type ProviderKey = 'google' | 'custom:navio';

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  google: 'Google',
  'custom:navio': 'Navio (product IdP)',
};

const PROVIDER_CAPABILITIES: Record<ProviderKey, string> = {
  google: 'Workspace sign-in. Verifies identity and email only — no roles or organizations.',
  'custom:navio': 'Product IdP. Supplies roles, organizations and service departments as token claims.',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin: 'Full platform access across every organization, including admin portal and system settings.',
  admin: 'Manage users, inboxes, settings and all conversations within your organizations.',
  agent: 'Handle conversations, calls and customers in the inboxes you have access to.',
  user: 'Read-only or limited access to the inboxes you are a member of.',
};


const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[140px_1fr] gap-3 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words font-medium">{children}</span>
  </div>
);

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
);

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
  } = useAuth();
  const { dateTime } = useDateFormatting();
  const { toast } = useToast();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const identities = (user?.identities || []) as Array<{ id: string; provider: string; identity_data?: Record<string, any> }>;
  const connectedProviders = useMemo(() => new Set(identities.map((i) => i.provider)), [identities]);
  const currentProvider = (user?.app_metadata as any)?.provider as string | undefined;

  const claimRoles = useMemo(() => getActiveRoles(navioClaims as any) || [], [navioClaims]);

  const userType =
    (user?.app_metadata as any)?.user_type ||
    (user?.user_metadata as any)?.user_type ||
    (connectedProviders.has('custom:navio') ? 'navio_team' : connectedProviders.has('google') ? 'google_workspace' : 'user');

  const handleLink = async (provider: ProviderKey) => {
    setBusyProvider(provider);
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: provider as any,
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({
        title: 'Could not connect sign-in method',
        description: e?.message || 'Identity linking is not enabled for this project.',
        variant: 'destructive',
      });
      setBusyProvider(null);
    }
  };

  const handleUnlink = async (provider: string) => {
    const identity = identities.find((i) => i.provider === provider);
    if (!identity) return;
    setBusyProvider(provider);
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity as any);
      if (error) throw error;
      toast({ title: 'Disconnected', description: `${PROVIDER_LABELS[provider as ProviderKey] || provider} was disconnected.` });
    } catch (e: any) {
      toast({
        title: 'Could not disconnect',
        description: e?.message || 'You must keep at least one sign-in method.',
        variant: 'destructive',
      });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>My account</CardTitle>
        <CardDescription>Account information, sign-in method and access for this session.</CardDescription>
      </CardHeader>
      <CardContent>
        <section>
          <h3 className="text-sm font-semibold mb-1">Account</h3>
          <Row label="Name">{profile?.full_name || (user?.user_metadata as any)?.full_name || '—'}</Row>
          <Row label="Email">{user?.email || '—'}</Row>
          <Row label="User type">
            <Badge variant="secondary" className="font-mono text-[11px]">{userType}</Badge>
          </Row>
          <Row label="User ID">
            <span className="font-mono text-xs">{user?.id || '—'}</span>
          </Row>
          <Row label="Last sign-in">
            {user?.last_sign_in_at ? dateTime(new Date(user.last_sign_in_at)) : '—'}
          </Row>
        </section>

        <Separator className="my-4" />

        <section>
          <h3 className="text-sm font-semibold">Sign-in (IdP)</h3>
          <p className="text-xs text-muted-foreground mb-2">
            The identity providers that can authenticate this account, and what each one supplies.
          </p>
          {identities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No external identity providers on this session.</p>
          ) : (
            <div className="space-y-2">
              {identities.map((i) => (
                <div key={i.id} className="rounded-md border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {PROVIDER_LABELS[i.provider as ProviderKey] || i.provider}
                    </span>
                    <Badge variant="outline" className="font-mono text-[10px]">{i.provider}</Badge>
                    {i.provider === currentProvider && <Badge className="text-[10px]">Used this session</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground break-words">
                    {(i.identity_data?.email as string) || user?.email || '—'}
                    {' · '}
                    {PROVIDER_CAPABILITIES[i.provider as ProviderKey] || 'Authentication only.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>


        <Separator className="my-4" />

        <section>
          <h3 className="text-sm font-semibold">Linked sign-ins</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Connect several sign-in methods to the same account, so both Google and Navio give access to the same user.
          </p>
          <div className="space-y-2">
            {(Object.keys(PROVIDER_LABELS) as ProviderKey[]).map((provider) => {
              const isConnected = connectedProviders.has(provider);
              const isBusy = busyProvider === provider;
              const isOnlyIdentity = isConnected && identities.length <= 1;
              return (
                <div
                  key={provider}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{PROVIDER_LABELS[provider]}</p>
                    <p className="text-xs text-muted-foreground">{isConnected ? 'Connected' : 'Not connected'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isConnected ? 'outline' : 'default'}
                    disabled={isBusy || isOnlyIdentity}
                    onClick={() => (isConnected ? handleUnlink(provider) : handleLink(provider))}
                    title={isOnlyIdentity ? 'You must keep at least one sign-in method' : undefined}
                  >
                    {isBusy && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    {isConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>

        <Separator className="my-4" />

        <section>
          <h3 className="text-sm font-semibold">Access from IdP</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Roles and scope delivered in the sign-in token, before Support Hub applies its own rules.
          </p>
          {claimRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No organization claims from external sign-in. Sign in with Navio to pull roles and departments from the IdP.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {claimRoles.map((r: string) => (
                <Badge key={r} variant="secondary" className="font-mono text-[11px]">{r}</Badge>
              ))}
            </div>
          )}
        </section>

        <Separator className="my-4" />

        <section>
          <h3 className="text-sm font-semibold">Access in Support Hub</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Effective permissions for this account in this product.
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="secondary" className="font-mono text-[11px]">{role}</Badge>
            {effectiveScope?.isSuperuser && <Badge>All organizations</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {ROLE_DESCRIPTIONS[role as string] || 'Access is limited to the inboxes and organizations you are a member of.'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {accessibleOrganizations?.length ?? 0} organization(s) · {accessibleServiceDepartments?.length ?? 0} department(s) visible
            {memberships?.length ? ` via ${memberships.length} membership(s).` : '.'}
          </p>
          {(accessibleOrganizations?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {accessibleOrganizations.slice(0, 12).map((o) => (
                <Badge key={o.navioId ?? o.localId ?? o.name} variant="outline" className="text-[11px]">
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {accessibleServiceDepartments.slice(0, 12).map((d) => (
                <Badge key={d.navioId ?? d.localId ?? d.name} variant="secondary" className="text-[11px]">
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
        </section>

      </CardContent>
    </Card>
  );
};

export default AccountInfoCard;
