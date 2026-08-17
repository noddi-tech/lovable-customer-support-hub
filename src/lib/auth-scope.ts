/**
 * Support Hub scope: product IdP memberships (`navio:active`) define which
 * service organizations and service departments a user may see.
 *
 * Pure claim accessors live in `@navio/nidp` — re-exported here for a single
 * import path inside this app. Adapted from navio-forecast-dashboard.
 */

import {
  getActiveDepartments,
  getActiveMembership,
  getActiveOrganization,
  getActiveRoles,
  getDepartments,
  getMemberships,
  getOrganizations,
  type NavioClaims,
  type NavioDepartment,
  type NavioOrganization,
  summarizeClaimScope,
} from "@navio/nidp";
import { isNetworkSuperuser } from "@/lib/auth-access";

export {
  getActiveDepartments,
  getActiveMembership,
  getActiveOrganization,
  getActiveRoles,
  getDepartments as getClaimDepartments,
  getMemberships as getClaimMemberships,
  getOrganizations as getClaimOrganizations,
  summarizeClaimScope,
};

export type LocalOrganization = {
  id: string;
  display_name?: string;
  name?: string;
  slug: string | null;
  navio_organization_id: number | null;
};

export type LocalDepartment = {
  id: string;
  organization_id: string;
  display_name?: string;
  name?: string;
  slug: string | null;
  navio_department_id: number | null;
};

export type LocalDepartmentAccess = {
  user_id: string;
  department_id: string;
};

export type LocalOrgRole = {
  user_id?: string;
  organization_id: string | null;
  role: string;
};

export type ServiceDepartmentOption = {
  /** navio-core ServiceDepartment.id (what growth/API filters use) */
  navioId: number;
  name: string;
  slug?: string;
  /** Local Supabase UUID when a matching `departments` row exists */
  localId?: string;
  organizationNavioId?: string | number;
  organizationSlug?: string;
};

export type ServiceOrganizationOption = {
  /** navio-core ServiceOrganization.id */
  navioId: number;
  name: string;
  slug?: string;
  /** Local Supabase UUID when a matching `organizations` row exists */
  localId?: string;
};

export type EffectiveScope = {
  isSuperuser: boolean;
  organizations: ServiceOrganizationOption[];
  departments: ServiceDepartmentOption[];
  /** True when non-superuser has zero orgs/depts (blocked / empty product) */
  isEmpty: boolean;
};

function asNavioId(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function localOrgName(o: LocalOrganization): string {
  return o.display_name || o.name || o.slug || o.id;
}

function localDeptName(d: LocalDepartment): string {
  return d.display_name || d.name || d.slug || d.id;
}

function isSuperuserRoles(
  roles: LocalOrgRole[],
  claims: Partial<NavioClaims>,
  forceSuperuser = false
): boolean {
  return forceSuperuser || isNetworkSuperuser(claims, roles);
}

/**
 * Service organizations the user may access (navio SO ids), from memberships
 * / flat claims, merged with local Supabase org rows.
 */
export function getAccessibleOrganizations(
  claims: Partial<NavioClaims>,
  localOrganizations: LocalOrganization[] = [],
  localRoles: LocalOrgRole[] = [],
  isSuperuser = false
): ServiceOrganizationOption[] {
  const byNavioId = new Map<number, ServiceOrganizationOption>();

  const addOrg = (
    org: { id?: string | number; slug?: string; name?: string },
    localId?: string
  ) => {
    const navioId = asNavioId(org.id);
    if (navioId == null) return;
    const local =
      localId != null
        ? localOrganizations.find((o) => o.id === localId)
        : localOrganizations.find((o) => o.navio_organization_id === navioId);
    const existing = byNavioId.get(navioId);
    if (existing) {
      if (!existing.localId && local) existing.localId = local.id;
      if (!existing.name && (org.name || local)) {
        existing.name = org.name || (local ? localOrgName(local) : existing.name);
      }
      return;
    }
    byNavioId.set(navioId, {
      navioId,
      name: org.name || (local ? localOrgName(local) : `Organization ${navioId}`),
      slug: org.slug ?? local?.slug ?? undefined,
      localId: local?.id ?? localId,
    });
  };

  if (isSuperuser) {
    for (const o of getOrganizations(claims)) addOrg(o);
    for (const lo of localOrganizations) {
      if (lo.navio_organization_id != null) {
        addOrg(
          {
            id: lo.navio_organization_id,
            slug: lo.slug ?? undefined,
            name: localOrgName(lo),
          },
          lo.id
        );
      }
    }
    return [...byNavioId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  const memberships = getMemberships(claims);
  if (memberships.length > 0) {
    for (const m of memberships) {
      if (m.service_organization) addOrg(m.service_organization);
    }
  } else {
    for (const o of getOrganizations(claims)) addOrg(o);
    const active = getActiveOrganization(claims);
    if (active) addOrg(active);
  }

  // Local org roles without claim graph (Google / password / legacy).
  if (byNavioId.size === 0 && localRoles.length > 0) {
    const roleOrgIds = new Set(
      localRoles
        .filter((r) =>
          ["org_admin", "org_user", "admin", "agent", "user", "super_admin"].includes(r.role)
        )
        .map((r) => r.organization_id)
        .filter((id): id is string => id != null)
    );
    for (const lo of localOrganizations) {
      if (!roleOrgIds.has(lo.id)) continue;
      if (lo.navio_organization_id != null) {
        addOrg(
          {
            id: lo.navio_organization_id,
            slug: lo.slug ?? undefined,
            name: localOrgName(lo),
          },
          lo.id
        );
      }
    }
  } else {
    // Attach local UUIDs when navio ids match
    for (const lo of localOrganizations) {
      if (lo.navio_organization_id == null) continue;
      const existing = byNavioId.get(lo.navio_organization_id);
      if (existing && !existing.localId) existing.localId = lo.id;
    }
  }

  return [...byNavioId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Service departments the user is connected to via navio-core memberships,
 * shaped for forecast filters (integer navio IDs), merged with local tables.
 */
export function getAccessibleServiceDepartments(
  claims: Partial<NavioClaims>,
  localDepartments: LocalDepartment[] = [],
  localAccess: LocalDepartmentAccess[] = [],
  options: {
    isSuperuser?: boolean;
    localOrganizations?: LocalOrganization[];
    localRoles?: LocalOrgRole[];
  } = {}
): ServiceDepartmentOption[] {
  const { isSuperuser = false, localOrganizations = [], localRoles = [] } = options;
  const byNavioId = new Map<number, ServiceDepartmentOption>();

  const addClaimDept = (d: NavioDepartment, org?: NavioOrganization | null) => {
    const navioId = asNavioId(d.id);
    if (navioId == null) return;
    const local = localDepartments.find((ld) => ld.navio_department_id === navioId);
    const existing = byNavioId.get(navioId);
    if (existing) {
      if (!existing.localId && local) existing.localId = local.id;
      return;
    }
    byNavioId.set(navioId, {
      navioId,
      name: d.name || (local ? localDeptName(local) : `Department ${navioId}`),
      slug: d.slug ?? local?.slug ?? undefined,
      localId: local?.id,
      organizationNavioId: org?.id,
      organizationSlug: org?.slug,
    });
  };

  if (isSuperuser) {
    for (const d of getDepartments(claims)) {
      addClaimDept(d, getActiveOrganization(claims));
    }
    for (const ld of localDepartments) {
      if (ld.navio_department_id == null) continue;
      const existing = byNavioId.get(ld.navio_department_id);
      if (existing) {
        existing.localId = ld.id;
        continue;
      }
      const org = localOrganizations.find((o) => o.id === ld.organization_id);
      byNavioId.set(ld.navio_department_id, {
        navioId: ld.navio_department_id,
        name: localDeptName(ld),
        slug: ld.slug ?? undefined,
        localId: ld.id,
        organizationNavioId: org?.navio_organization_id ?? undefined,
        organizationSlug: org?.slug ?? undefined,
      });
    }
    return [...byNavioId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  const memberships = getMemberships(claims);
  if (memberships.length > 0) {
    for (const m of memberships) {
      for (const d of m.departments ?? []) {
        addClaimDept(d, m.service_organization);
      }
    }
  } else {
    for (const d of getDepartments(claims)) {
      addClaimDept(d, getActiveOrganization(claims));
    }
  }

  // Local department access (explicit rows).
  const accessIds = new Set(localAccess.map((a) => a.department_id));
  if (accessIds.size > 0) {
    for (const ld of localDepartments) {
      if (!accessIds.has(ld.id)) continue;
      if (ld.navio_department_id == null) continue;
      const existing = byNavioId.get(ld.navio_department_id);
      if (existing) {
        existing.localId = ld.id;
        continue;
      }
      byNavioId.set(ld.navio_department_id, {
        navioId: ld.navio_department_id,
        name: localDeptName(ld),
        slug: ld.slug ?? undefined,
        localId: ld.id,
      });
    }
  } else if (byNavioId.size === 0 && localRoles.length > 0) {
    // Local-only: members get all depts in their orgs (no open network).
    const roleOrgIds = new Set(
      localRoles
        .filter((r) =>
          ["org_admin", "org_user", "admin", "agent", "user", "super_admin"].includes(r.role)
        )
        .map((r) => r.organization_id)
        .filter((id): id is string => id != null)
    );
    for (const ld of localDepartments) {
      if (!roleOrgIds.has(ld.organization_id)) continue;
      if (ld.navio_department_id == null) continue;
      byNavioId.set(ld.navio_department_id, {
        navioId: ld.navio_department_id,
        name: localDeptName(ld),
        slug: ld.slug ?? undefined,
        localId: ld.id,
      });
    }
  }

  return [...byNavioId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Single effective scope used by UI filters and API clamping.
 */
export function getEffectiveScope(args: {
  claims: Partial<NavioClaims>;
  localOrganizations?: LocalOrganization[];
  localDepartments?: LocalDepartment[];
  localAccess?: LocalDepartmentAccess[];
  localRoles?: LocalOrgRole[];
  /** e.g. Google employee login — full network scope */
  forceSuperuser?: boolean;
}): EffectiveScope {
  const {
    claims,
    localOrganizations = [],
    localDepartments = [],
    localAccess = [],
    localRoles = [],
    forceSuperuser = false,
  } = args;

  const isSuperuser = isSuperuserRoles(localRoles, claims, forceSuperuser);
  const organizations = getAccessibleOrganizations(
    claims,
    localOrganizations,
    localRoles,
    isSuperuser
  );
  const departments = getAccessibleServiceDepartments(claims, localDepartments, localAccess, {
    isSuperuser,
    localOrganizations,
    localRoles,
  });

  return {
    isSuperuser,
    organizations,
    departments,
    isEmpty: !isSuperuser && organizations.length === 0 && departments.length === 0,
  };
}

/** Drop department ids not in scope. Superuser: pass through. */
export function clampDepartmentIds(requested: number[], scope: EffectiveScope): number[] {
  if (scope.isSuperuser) return requested;
  const allowed = new Set(scope.departments.map((d) => d.navioId));
  return requested.filter((id) => allowed.has(id));
}

/**
 * Resolve department ids for API requests.
 * - Superuser + empty selection → [] (upstream “all”)
 * - Non-superuser + empty selection → all membership department ids
 * - Non-empty → clamped to scope
 */
export function resolveApiDepartmentIds(selected: number[], scope: EffectiveScope): number[] {
  if (scope.isSuperuser) {
    return selected.length === 0 ? [] : selected;
  }
  if (selected.length === 0) {
    return scope.departments.map((d) => d.navioId);
  }
  return clampDepartmentIds(selected, scope);
}

/**
 * Clamp a requested org id (navio SO id as number or string, or local UUID)
 * to an allowed navio SO id. Returns null if out of scope (non-superuser).
 */
export function clampOrgId(
  requested: string | number | null | undefined,
  scope: EffectiveScope
): number | null {
  if (requested == null || requested === "") return null;

  const asNum = asNavioId(requested);
  if (scope.isSuperuser) {
    if (asNum != null) return asNum;
    return null;
  }

  if (asNum != null) {
    const hit = scope.organizations.find((o) => o.navioId === asNum);
    return hit ? hit.navioId : null;
  }

  const byLocal = scope.organizations.find((o) => o.localId === String(requested));
  if (byLocal) return byNavioIdOrNull(byLocal.navioId);

  const bySlug = scope.organizations.find((o) => o.slug === String(requested));
  return bySlug ? bySlug.navioId : null;
}

function byNavioIdOrNull(id: number): number | null {
  return Number.isFinite(id) ? id : null;
}

/** Default org for filters: active claim SO, else first accessible. */
export function pickDefaultOrgId(
  scope: EffectiveScope,
  claims: Partial<NavioClaims>
): number | null {
  if (scope.organizations.length === 0) {
    if (scope.isSuperuser) return null;
    return null;
  }
  const active = getActiveOrganization(claims);
  const activeId = asNavioId(active?.id);
  if (activeId != null && scope.organizations.some((o) => o.navioId === activeId)) {
    return activeId;
  }
  if (scope.isSuperuser && activeId != null) return activeId;
  return scope.organizations[0]?.navioId ?? null;
}

/**
 * Whether the user may access a department identified either as:
 * - local Supabase UUID (`departments.id`)
 * - navio ServiceDepartment integer id (stringified)
 */
export function canAccessDepartmentId(args: {
  deptId: string;
  claims: Partial<NavioClaims>;
  localDepartments: LocalDepartment[];
  localAccess: LocalDepartmentAccess[];
  isSuperuser: boolean;
  localOrganizations?: LocalOrganization[];
  localRoles?: LocalOrgRole[];
}): boolean {
  const {
    deptId,
    claims,
    localDepartments,
    localAccess,
    isSuperuser,
    localOrganizations = [],
    localRoles = [],
  } = args;
  if (isSuperuser) return true;

  const accessible = getAccessibleServiceDepartments(claims, localDepartments, localAccess, {
    isSuperuser: false,
    localOrganizations,
    localRoles,
  });
  if (accessible.some((d) => d.localId === deptId)) return true;
  if (accessible.some((d) => String(d.navioId) === deptId)) return true;

  // Local UUID without navio_department_id mapping
  if (localAccess.some((a) => a.department_id === deptId)) return true;

  const localDept = localDepartments.find((d) => d.id === deptId);
  if (localDept) {
    const roleOrgIds = new Set(
      localRoles
        .filter((r) =>
          ["org_admin", "org_user", "admin", "agent", "user", "super_admin"].includes(r.role)
        )
        .map((r) => r.organization_id)
        .filter((id): id is string => id != null)
    );
    if (roleOrgIds.has(localDept.organization_id) && localAccess.length === 0) {
      return true;
    }
  }

  return false;
}

export function canAccessOrganizationId(args: {
  orgId: string;
  claims: Partial<NavioClaims>;
  localOrganizations: LocalOrganization[];
  localRoles: LocalOrgRole[];
  isSuperuser: boolean;
}): boolean {
  const { orgId, claims, localOrganizations, localRoles, isSuperuser } = args;
  if (isSuperuser) return true;

  const orgs = getAccessibleOrganizations(claims, localOrganizations, localRoles, false);
  if (orgs.some((o) => String(o.navioId) === orgId)) return true;
  if (orgs.some((o) => o.localId === orgId)) return true;
  if (orgs.some((o) => o.slug === orgId)) return true;

  // Claim graph may use string ids that are not integers (still valid for access checks).
  const claimOrgs = getOrganizations(claims);
  if (claimOrgs.some((o) => String(o.id) === orgId || o.slug === orgId)) return true;
  const active = getActiveOrganization(claims);
  if (active && (String(active.id) === orgId || active.slug === orgId)) return true;
  for (const m of getMemberships(claims)) {
    const so = m.service_organization;
    if (so && (String(so.id) === orgId || so.slug === orgId)) return true;
  }

  // Local UUID membership via roles (even when navio_organization_id is null)
  if (
    localRoles.some(
      (r) =>
        r.organization_id === orgId &&
        ["org_admin", "org_user", "admin", "agent", "user", "super_admin"].includes(r.role)
    )
  ) {
    return true;
  }

  return false;
}

/** Local Support Hub organization UUIDs the user may access. */
export function getAllowedLocalOrgIds(scope: EffectiveScope): string[] {
  return scope.organizations
    .map((o) => o.localId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** Local department UUIDs the user may access (when mapped). */
export function getAllowedLocalDepartmentIds(scope: EffectiveScope): string[] {
  return scope.departments
    .map((d) => d.localId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
}

/** Navio SO integer ids from scope. */
export function getAllowedNavioOrgIds(scope: EffectiveScope): number[] {
  return scope.organizations.map((o) => o.navioId);
}

/** Navio SD integer ids from scope. */
export function getAllowedNavioDepartmentIds(scope: EffectiveScope): number[] {
  return scope.departments.map((d) => d.navioId);
}
