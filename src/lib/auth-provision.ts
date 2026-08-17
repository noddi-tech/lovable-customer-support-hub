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
import {
  hasIamAuthorizationGraph,
  hasSupportHubNavioAccess,
  isIamSupportHubAdmin,
  SUPPORTHUB_USER_ROLE,
} from "@/lib/auth-access";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
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

/** Employee Google domains that map to network superuser. Matches the RPC guard. */
const EMPLOYEE_GOOGLE_DOMAINS = new Set(["noddi.no"]);

function isVerifiedGoogleEmail(value: unknown): boolean {
  return value === true || value === "true" || value === "t" || value === "1";
}

/**
 * True only for a **verified Google identity on an employee domain** (noddi.no).
 * Do not trust the bare `provider === 'google'` flag: a misconfigured Supabase
 * Google client (no `hd` restriction) would otherwise let any gmail.com account
 * be treated as employee superuser. The RPC enforces the same domain server-side;
 * this is the UI-side mirror (RLS remains the real boundary).
 */
export function isGoogleAuthUser(user: User | null | undefined): boolean {
  if (!user) return false;
  for (const identity of user.identities ?? []) {
    if (identity.provider !== "google") continue;
    const data = (identity.identity_data ?? {}) as Record<string, unknown>;
    const email = typeof data.email === "string" ? data.email.toLowerCase() : "";
    const domain = email.includes("@") ? email.slice(email.lastIndexOf("@") + 1) : "";
    const hd = typeof data.hd === "string" ? data.hd.toLowerCase() : "";
    const domainOk = !!domain && EMPLOYEE_GOOGLE_DOMAINS.has(domain);
    const hdOk = !hd || EMPLOYEE_GOOGLE_DOMAINS.has(hd);
    if (domainOk && hdOk && isVerifiedGoogleEmail(data.email_verified)) {
      return true;
    }
  }
  return false;
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
  if (isIamSupportHubAdmin(claims)) {
    return "super_admin";
  }
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
  if (isIamSupportHubAdmin(claims)) return true;
  if (hasIamAuthorizationGraph(claims)) return false;
  const active = getActiveRoles(claims);
  return active.includes("owner_superuser") || active.includes("viewer_superuser");
}

export { hasSupportHubNavioAccess, SUPPORTHUB_USER_ROLE };

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
/**
 * Collapse other auth.users sharing the caller's email into the current account
 * (server-side RPC, caller-scoped). Makes Google + Navio logins for the same
 * email converge on one account. Best-effort: returns the merge count or null.
 * Run before provisioning so the current session inherits the duplicate's data.
 * See docs/sso/navio-auth-setup.md → Duplicate accounts.
 */
export async function reconcileDuplicateAccounts(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('reconcile_my_duplicate_accounts' as never);
    if (error) {
      logger.warn('reconcile_my_duplicate_accounts failed', { error: error.message }, 'Auth');
      return 0;
    }
    const merged = (data as { merged?: number } | null)?.merged ?? 0;
    if (merged > 0) {
      logger.info('Merged duplicate account(s) into current user', { merged }, 'Auth');
    }
    return merged;
  } catch (err) {
    logger.warn('reconcileDuplicateAccounts threw', { err: String(err) }, 'Auth');
    return 0;
  }
}

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
