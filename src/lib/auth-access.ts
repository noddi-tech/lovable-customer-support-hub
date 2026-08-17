import {
  getIamPermissions,
  getIamRoles,
  getRolesForOrganization,
  hasIamPermission,
  hasIamRole,
} from "@navio/nidp";
import type { User } from "@supabase/supabase-js";

/** IAM permission ids Support Hub enforces (IamExternalPermission catalog). */
export const SUPPORTHUB_ACCESS = "supporthub.access";
export const SUPPORTHUB_READ = "supporthub.read";
export const SUPPORTHUB_ADMIN = "supporthub.admin";

/** Assignment role that grants `supporthub.access`. */
export const SUPPORTHUB_USER_ROLE = "roles/supporthub.user";
export const SUPPORTHUB_ADMIN_ROLE = "roles/supporthub.admin";

type ClaimsLike = Parameters<typeof getRolesForOrganization>[0];
type LocalRoleLike = { role: string };

const SUPPORTHUB_ACCESS_PERMISSIONS = [
  SUPPORTHUB_ACCESS,
  SUPPORTHUB_READ,
  SUPPORTHUB_ADMIN,
] as const;

export function hasIamAuthorizationGraph(claims: ClaimsLike): boolean {
  return getIamPermissions(claims).length > 0 || getIamRoles(claims).length > 0;
}

export function hasSupportHubPermission(claims: ClaimsLike, permissionId: string): boolean {
  if (hasIamPermission(claims, permissionId)) return true;
  return permissionId !== SUPPORTHUB_ADMIN && hasIamPermission(claims, SUPPORTHUB_ADMIN);
}

export function hasPlatformSuperuserRole(claims: ClaimsLike): boolean {
  return hasIamRole(claims, "roles/superuser");
}

export function hasSupportHubAccessPermission(claims: ClaimsLike): boolean {
  return (
    hasPlatformSuperuserRole(claims) ||
    SUPPORTHUB_ACCESS_PERMISSIONS.some((id) => hasIamPermission(claims, id))
  );
}

export function isIamSupportHubAdmin(claims: ClaimsLike): boolean {
  return hasPlatformSuperuserRole(claims) || hasIamPermission(claims, SUPPORTHUB_ADMIN);
}

function hasLegacyClaimSuperuserRole(claims: ClaimsLike): boolean {
  return getRolesForOrganization(claims).some(
    (role) => role === "owner_superuser" || role === "viewer_superuser"
  );
}

export function isLegacyLocalSuperuser(localRoles: LocalRoleLike[] = []): boolean {
  return localRoles.some(
    (r) =>
      r.role === "owner_superuser" ||
      r.role === "viewer_superuser" ||
      r.role === "super_admin"
  );
}

/**
 * Network-wide data scope. IAM `supporthub.admin` wins. When the token has
 * no IAM graph, fall back to local super_admin / claim role names / @noddi.no Google.
 */
export function isNetworkSuperuser(
  _user: User | null | undefined,
  claims: ClaimsLike,
  localRoles: LocalRoleLike[] = [],
  /** @noddi.no Google fallback when the token has no IAM graph */
  noddiGoogleFallback = false
): boolean {
  if (isIamSupportHubAdmin(claims)) return true;
  if (hasIamAuthorizationGraph(claims)) return false;
  return (
    isLegacyLocalSuperuser(localRoles) ||
    noddiGoogleFallback ||
    hasLegacyClaimSuperuserRole(claims)
  );
}

/**
 * Navio login gate: `supporthub.access` (or admin/read) on the token.
 * No IAM graph: legacy claim superuser role only.
 */
export function hasSupportHubNavioAccess(claims: ClaimsLike): boolean {
  if (hasSupportHubAccessPermission(claims)) return true;
  if (hasIamAuthorizationGraph(claims)) return false;
  return hasLegacyClaimSuperuserRole(claims);
}

/** @deprecated Role names are assignment-only. */
export function hasSupportHubUserRole(claims: ClaimsLike): boolean {
  const roles = [...getRolesForOrganization(claims), ...getIamRoles(claims)];
  return roles.some((role) => role === SUPPORTHUB_USER_ROLE || role === "supporthub.user");
}
