/**
 * Membership scope for Support Hub edge functions.
 * Parses navio_* claims from the Supabase user and clamps org/department filters.
 */

export type ScopeResult = {
  isSuperuser: boolean;
  departmentNavioIds: number[];
  organizationNavioIds: number[];
};

function asNavioId(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Collect navio claims from user_metadata / app_metadata / identities. */
export function extractNavioClaims(user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  identities?: Array<Record<string, unknown>> | null;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const sources: Array<Record<string, unknown> | null | undefined> = [
    user.user_metadata ?? undefined,
    user.app_metadata ?? undefined,
  ];
  for (const id of user.identities ?? []) {
    const data = asRecord(id.identity_data as unknown);
    if (data) sources.push(data);
  }
  for (const src of sources) {
    if (!src) continue;
    for (const [k, v] of Object.entries(src)) {
      if (k.startsWith("navio_") && out[k] === undefined) out[k] = v;
    }
  }
  return out;
}

function collectFromClaims(claims: Record<string, unknown>): ScopeResult {
  const activeRoles = Array.isArray(claims.navio_active_roles)
    ? (claims.navio_active_roles as unknown[]).map(String)
    : [];
  const isSuperuser =
    activeRoles.includes("owner_superuser") ||
    activeRoles.includes("viewer_superuser");

  const deptIds = new Set<number>();
  const orgIds = new Set<number>();

  const memberships = Array.isArray(claims.navio_memberships)
    ? (claims.navio_memberships as unknown[])
    : [];
  for (const m of memberships) {
    const mem = asRecord(m);
    if (!mem) continue;
    const so = asRecord(mem.service_organization);
    const oid = asNavioId(so?.id);
    if (oid != null) orgIds.add(oid);
    const depts = Array.isArray(mem.departments) ? mem.departments : [];
    for (const d of depts) {
      const dept = asRecord(d);
      const did = asNavioId(dept?.id);
      if (did != null) deptIds.add(did);
    }
  }

  if (orgIds.size === 0) {
    const orgs = Array.isArray(claims.navio_organizations)
      ? (claims.navio_organizations as unknown[])
      : [];
    for (const o of orgs) {
      const org = asRecord(o);
      const oid = asNavioId(org?.id);
      if (oid != null) orgIds.add(oid);
    }
    const active = asRecord(claims.navio_active_organization);
    const aid = asNavioId(active?.id);
    if (aid != null) orgIds.add(aid);
  }

  if (deptIds.size === 0) {
    const depts = Array.isArray(claims.navio_departments)
      ? (claims.navio_departments as unknown[])
      : [];
    for (const d of depts) {
      const dept = asRecord(d);
      const did = asNavioId(dept?.id);
      if (did != null) deptIds.add(did);
    }
    const activeDepts = Array.isArray(claims.navio_active_departments)
      ? (claims.navio_active_departments as unknown[])
      : [];
    for (const d of activeDepts) {
      const dept = asRecord(d);
      const did = asNavioId(dept?.id);
      if (did != null) deptIds.add(did);
    }
  }

  return {
    isSuperuser,
    departmentNavioIds: [...deptIds],
    organizationNavioIds: [...orgIds],
  };
}

function isGoogleAuthUser(user: {
  app_metadata?: Record<string, unknown> | null;
  identities?: Array<Record<string, unknown>> | null;
}): boolean {
  const app = asRecord(user.app_metadata) ?? {};
  if (app.provider === "google") return true;
  if (Array.isArray(app.providers) && app.providers.includes("google")) return true;
  for (const id of user.identities ?? []) {
    if (id.provider === "google") return true;
  }
  return false;
}

export function resolveUserScope(
  user: {
    user_metadata?: Record<string, unknown> | null;
    app_metadata?: Record<string, unknown> | null;
    identities?: Array<Record<string, unknown>> | null;
  },
  /** When true (local super_admin), treat as superuser. */
  localIsSuperuser = false
): ScopeResult {
  const fromClaims = collectFromClaims(extractNavioClaims(user));
  // Noddi employees only have company Google accounts → network superuser.
  const googleEmployee = isGoogleAuthUser(user);
  return {
    ...fromClaims,
    isSuperuser: localIsSuperuser || fromClaims.isSuperuser || googleEmployee,
  };
}

/**
 * Clamp a requested navio ServiceDepartment id list to membership scope.
 * Empty selection for non-superuser expands to all allowed SDs.
 */
export function clampNavioDepartmentIds(
  requested: number[],
  scope: ScopeResult
): { ids: number[]; error?: string; status?: number } {
  if (scope.isSuperuser) {
    return { ids: requested };
  }
  const allowed = new Set(scope.departmentNavioIds);
  if (allowed.size === 0) {
    return { ids: [], error: "No service department scope for user", status: 403 };
  }
  if (requested.length === 0) {
    return { ids: [...allowed] };
  }
  const clamped = requested.filter((id) => allowed.has(id));
  if (clamped.length === 0) {
    return {
      ids: [],
      error: "Requested departments are outside your membership scope",
      status: 403,
    };
  }
  return { ids: clamped };
}

/**
 * Whether the user may use a given navio ServiceOrganization id.
 * Superuser: always. Others: must be in memberships.
 */
export function canAccessNavioOrganization(
  orgNavioId: number | null | undefined,
  scope: ScopeResult
): boolean {
  if (scope.isSuperuser) return true;
  if (orgNavioId == null || !Number.isFinite(orgNavioId)) return false;
  return scope.organizationNavioIds.includes(orgNavioId);
}

/**
 * Whether the user may use a given navio ServiceDepartment id.
 */
export function canAccessNavioDepartment(
  deptNavioId: number | null | undefined,
  scope: ScopeResult
): boolean {
  if (scope.isSuperuser) return true;
  if (deptNavioId == null || !Number.isFinite(deptNavioId)) return false;
  return scope.departmentNavioIds.includes(deptNavioId);
}
