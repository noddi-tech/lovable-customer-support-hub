import {
  getActiveOrganization,
  getActiveRoles,
  getMemberships,
  getNavioAuthContext,
  getOrganizations,
  hasRoleForOrganization,
  isNavioCoreOidcUser as isNavioCoreOidcUserFromNidp,
  PRODUCT_OIDC_ISSUER,
  type NavioClaims,
  type SupabaseUserLike,
} from "@navio/nidp";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  getAllowedNavioOrgIds,
  getEffectiveScope,
  type EffectiveScope,
  type LocalOrganization,
} from "@/lib/auth-scope";

export { PRODUCT_OIDC_ISSUER };

/** Duck-type cast for @navio/nidp helpers. */
export function asNidpUser(
  user: User | null | undefined
): SupabaseUserLike | null | undefined {
  return user as unknown as SupabaseUserLike | null | undefined;
}

/**
 * True when this Supabase user authenticated via **Sign in with Navio**
 * (`custom:navio` → product IdP).
 */
export function isNavioCoreOidcUser(
  user: User | null | undefined
): boolean {
  return isNavioCoreOidcUserFromNidp(asNidpUser(user));
}

/**
 * True when the session includes Google as an auth provider.
 * Only Noddi employees have company Google accounts — treat as network superuser
 * for data scope (same as claim owner_superuser / local super_admin).
 */
export function isGoogleAuthUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const app = (user.app_metadata ?? {}) as {
    provider?: string;
    providers?: string[];
  };
  if (app.provider === "google") return true;
  if (Array.isArray(app.providers) && app.providers.includes("google")) {
    return true;
  }
  const identities = user.identities ?? [];
  return identities.some((i) => i.provider === "google");
}

/**
 * Ensure a product IdP (`custom:navio`) session has a Support Hub profile.
 * Does **not** grant super_admin — data scope comes from navio membership claims.
 *
 * RPC name is historical (Supabase).
 */
export async function ensureNavioSupportHubAccess(user: User): Promise<unknown> {
  if (!isNavioCoreOidcUser(user)) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "ensure_authentik_support_hub_access" as never
  );
  if (error) {
    console.error("[auth] ensure_authentik_support_hub_access failed", {
      userId: user.id,
      email: user.email,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  console.info("[auth] Navio Core session provisioned (profile only, no auto super_admin)", {
    userId: user.id,
    email: user.email,
  });
  return data;
}

function asNavioId(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function claimRoleForSync(claims: Partial<NavioClaims>): string {
  const active = getActiveRoles(claims);
  if (active.includes("owner_superuser") || active.includes("viewer_superuser")) {
    return "super_admin";
  }
  if (
    active.includes("org_admin") ||
    active.includes("admin") ||
    hasRoleForOrganization(claims, "org_admin") ||
    hasRoleForOrganization(claims, "admin")
  ) {
    return "admin";
  }
  return "agent";
}

function isClaimSuperuser(claims: Partial<NavioClaims>): boolean {
  const active = getActiveRoles(claims);
  return active.includes("owner_superuser") || active.includes("viewer_superuser");
}

/**
 * Sync local organization_memberships from product IdP SO memberships.
 * Requires organizations.navio_organization_id to be set for mapping.
 */
export async function syncNavioOrganizationMemberships(
  user: User,
  claims?: Partial<NavioClaims>,
  localOrganizations: LocalOrganization[] = []
): Promise<unknown> {
  if (!isNavioCoreOidcUser(user)) {
    return null;
  }

  const resolvedClaims =
    claims ?? getNavioAuthContext(asNidpUser(user)).claims;

  const scope: EffectiveScope = getEffectiveScope({
    claims: resolvedClaims,
    localOrganizations,
  });

  const navioOrgIds = getAllowedNavioOrgIds(scope);
  // Prefer numeric ids from memberships even when local map is empty.
  const fromMemberships = getMemberships(resolvedClaims)
    .map((m) => asNavioId(m.service_organization?.id))
    .filter((id): id is number => id != null);
  const fromOrgs = getOrganizations(resolvedClaims)
    .map((o) => asNavioId(o.id))
    .filter((id): id is number => id != null);

  const ids = [...new Set([...navioOrgIds, ...fromMemberships, ...fromOrgs])];
  const active = getActiveOrganization(resolvedClaims);
  const defaultId = asNavioId(active?.id);
  const superuser = isClaimSuperuser(resolvedClaims);

  const { data, error } = await supabase.rpc(
    "sync_navio_organization_memberships" as never,
    {
      p_navio_org_ids: ids,
      p_is_claim_superuser: superuser,
      p_default_navio_org_id: defaultId,
      p_role: claimRoleForSync(resolvedClaims),
    } as never
  );

  if (error) {
    console.error("[auth] sync_navio_organization_memberships failed", {
      userId: user.id,
      email: user.email,
      message: error.message,
      code: error.code,
      navioOrgIds: ids,
    });
    throw error;
  }

  console.info("[auth] Synced organization memberships from navio claims", {
    userId: user.id,
    navioOrgIds: ids,
    isClaimSuperuser: superuser,
    membershipCount: Array.isArray(data) ? (data as unknown[]).length : undefined,
  });
  return data;
}

/**
 * Full Navio bootstrap after login: profile provision + membership sync.
 */
export async function bootstrapNavioSupportHubAccess(
  user: User,
  localOrganizations: LocalOrganization[] = []
): Promise<{ claims: Partial<NavioClaims>; hasOrgGraph: boolean }> {
  const navioAuth = getNavioAuthContext(asNidpUser(user));
  if (!navioAuth.isNavioUser) {
    return { claims: {}, hasOrgGraph: false };
  }

  await ensureNavioSupportHubAccess(user);
  await syncNavioOrganizationMemberships(
    user,
    navioAuth.claims,
    localOrganizations
  );

  if (!navioAuth.hasOrgGraph) {
    console.warn(
      "[auth] Navio session has no org graph (memberships/roles). " +
        "User may lack SO memberships, or Supabase is not requesting navio:active."
    );
  } else {
    console.info("[auth] Navio claim scope", {
      userId: user.id,
      ...navioAuth.summary,
    });
  }

  return { claims: navioAuth.claims, hasOrgGraph: navioAuth.hasOrgGraph };
}

/**
 * Google employee login: ensure profile + super_admin (RLS + UI unrestricted).
 * Only company Google accounts exist for Noddi employees.
 */
export async function ensureGoogleEmployeeSupportHubAccess(
  user: User
): Promise<unknown> {
  if (!isGoogleAuthUser(user)) {
    return null;
  }

  const { data, error } = await supabase.rpc(
    "ensure_google_employee_support_hub_access" as never
  );
  if (error) {
    console.error("[auth] ensure_google_employee_support_hub_access failed", {
      userId: user.id,
      email: user.email,
      message: error.message,
      code: error.code,
    });
    throw error;
  }

  console.info("[auth] Google employee session provisioned as super_admin", {
    userId: user.id,
    email: user.email,
  });
  return data;
}

/**
 * Bootstrap access for any supported login path (Navio membership scope or Google superuser).
 */
export async function bootstrapSupportHubAccess(
  user: User,
  localOrganizations: LocalOrganization[] = []
): Promise<{ claims: Partial<NavioClaims>; hasOrgGraph: boolean }> {
  if (isNavioCoreOidcUser(user)) {
    return bootstrapNavioSupportHubAccess(user, localOrganizations);
  }
  if (isGoogleAuthUser(user)) {
    await ensureGoogleEmployeeSupportHubAccess(user);
    return { claims: {}, hasOrgGraph: false };
  }
  return { claims: {}, hasOrgGraph: false };
}
