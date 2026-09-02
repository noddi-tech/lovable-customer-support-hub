import {
  getIamPermissions,
  getIamRoles,
  getRolesForOrganization,
  hasIamPermission,
  hasIamRole,
} from "@navio/nidp"

/** IAM permission ids Support Hub enforces (IamExternalPermission catalog). */
export const SUPPORTHUB_ACCESS = "supporthub.access"
export const SUPPORTHUB_READ = "supporthub.read"
export const SUPPORTHUB_ADMIN = "supporthub.admin"

export const PLATFORM_SUPERUSER_ROLE = "roles/superuser"

type ClaimsLike = Parameters<typeof getRolesForOrganization>[0]
type LocalRoleLike = { role: string }

const SUPPORTHUB_ACCESS_PERMISSIONS = [
  SUPPORTHUB_ACCESS,
  SUPPORTHUB_READ,
  SUPPORTHUB_ADMIN,
] as const

const LEGACY_CLAIM_SUPERUSER_ROLES = new Set(["owner_superuser", "viewer_superuser"])

const LEGACY_LOCAL_SUPERUSER_ROLES = new Set([...LEGACY_CLAIM_SUPERUSER_ROLES, "super_admin"])

export function hasIamAuthorizationGraph(claims: ClaimsLike): boolean {
  return getIamPermissions(claims).length > 0 || getIamRoles(claims).length > 0
}

export function hasPlatformSuperuserRole(claims: ClaimsLike): boolean {
  return hasIamRole(claims, PLATFORM_SUPERUSER_ROLE)
}

export function hasSupportHubAccessPermission(claims: ClaimsLike): boolean {
  return (
    hasPlatformSuperuserRole(claims) ||
    SUPPORTHUB_ACCESS_PERMISSIONS.some((id) => hasIamPermission(claims, id))
  )
}

export function isIamSupportHubAdmin(claims: ClaimsLike): boolean {
  return hasPlatformSuperuserRole(claims) || hasIamPermission(claims, SUPPORTHUB_ADMIN)
}

function hasLegacyClaimSuperuserRole(claims: ClaimsLike): boolean {
  return getRolesForOrganization(claims).some((role) => LEGACY_CLAIM_SUPERUSER_ROLES.has(role))
}

function isLegacyLocalSuperuser(localRoles: LocalRoleLike[] = []): boolean {
  return localRoles.some((r) => LEGACY_LOCAL_SUPERUSER_ROLES.has(r.role))
}

/**
 * Network-wide data scope. IAM admin / platform superuser win.
 * Legacy local/claim/Google fallbacks apply only when the token has no IAM graph.
 */
export function isNetworkSuperuser(
  claims: ClaimsLike,
  localRoles: LocalRoleLike[] = [],
  noddiGoogleFallback = false,
): boolean {
  if (isIamSupportHubAdmin(claims)) return true
  if (hasIamAuthorizationGraph(claims)) return false
  return (
    isLegacyLocalSuperuser(localRoles) || noddiGoogleFallback || hasLegacyClaimSuperuserRole(claims)
  )
}

/** Navio login gate. No IAM graph: legacy claim superuser role only. */
export function hasSupportHubNavioAccess(claims: ClaimsLike): boolean {
  if (hasSupportHubAccessPermission(claims)) return true
  if (hasIamAuthorizationGraph(claims)) return false
  return hasLegacyClaimSuperuserRole(claims)
}
