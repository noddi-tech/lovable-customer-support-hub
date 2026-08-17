import type { NavioClaims } from "@navio/nidp";
import { describe, expect, it } from "vitest";
import {
  canAccessDepartmentId,
  canAccessOrganizationId,
  clampDepartmentIds,
  clampOrgId,
  getAccessibleOrganizations,
  getAccessibleServiceDepartments,
  getClaimDepartments,
  getEffectiveScope,
  pickDefaultOrgId,
  resolveApiDepartmentIds,
  summarizeClaimScope,
} from "@/lib/auth-scope";

const claimsWithMemberships = {
  navio_active_organization: { id: "1", slug: "tronderdekk", name: "Trønderdekk" },
  navio_active_roles: ["org_admin", "staff"],
  navio_active_departments: [
    { id: "10", slug: "oslo", name: "Oslo" },
    { id: "11", slug: "baerum", name: "Bærum" },
  ],
  navio_memberships: [
    {
      service_organization: { id: "1", slug: "tronderdekk", name: "Trønderdekk" },
      departments: [
        { id: "10", slug: "oslo", name: "Oslo" },
        { id: "11", slug: "baerum", name: "Bærum" },
      ],
      roles: ["org_admin"],
    },
    {
      service_organization: { id: "2", slug: "dekkpro", name: "Dekkpro" },
      departments: [{ id: "20", slug: "bergen", name: "Bergen" }],
      roles: ["org_user"],
    },
  ],
  navio_departments: [
    { id: "10", slug: "oslo", name: "Oslo" },
    { id: "11", slug: "baerum", name: "Bærum" },
    { id: "20", slug: "bergen", name: "Bergen" },
  ],
  navio_organizations: [
    { id: "1", slug: "tronderdekk", name: "Trønderdekk" },
    { id: "2", slug: "dekkpro", name: "Dekkpro" },
  ],
} as unknown as Partial<NavioClaims>;

describe("auth-scope", () => {
  it("lists all service departments from memberships", () => {
    const opts = getAccessibleServiceDepartments(claimsWithMemberships);
    expect(opts.map((o) => o.navioId).sort((a, b) => a - b)).toEqual([10, 11, 20]);
    expect(opts.find((o) => o.navioId === 20)?.name).toBe("Bergen");
  });

  it("lists organizations from memberships", () => {
    const orgs = getAccessibleOrganizations(claimsWithMemberships);
    expect(orgs.map((o) => o.navioId).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(orgs.find((o) => o.navioId === 2)?.name).toBe("Dekkpro");
  });

  it("joins local departments via navio_department_id", () => {
    const opts = getAccessibleServiceDepartments(
      claimsWithMemberships,
      [
        {
          id: "uuid-10",
          organization_id: "org-uuid",
          name: "Local Oslo",
          slug: "oslo",
          navio_department_id: 10,
        },
      ],
      []
    );
    expect(opts.find((o) => o.navioId === 10)?.localId).toBe("uuid-10");
  });

  it("canAccessDepartmentId accepts navio integer ids and local UUIDs", () => {
    const local = [
      {
        id: "uuid-10",
        organization_id: "org",
        name: "Oslo",
        slug: "oslo",
        navio_department_id: 10,
      },
    ];
    expect(
      canAccessDepartmentId({
        deptId: "10",
        claims: claimsWithMemberships,
        localDepartments: local,
        localAccess: [],
        isSuperuser: false,
      })
    ).toBe(true);
    expect(
      canAccessDepartmentId({
        deptId: "uuid-10",
        claims: claimsWithMemberships,
        localDepartments: local,
        localAccess: [],
        isSuperuser: false,
      })
    ).toBe(true);
    expect(
      canAccessDepartmentId({
        deptId: "999",
        claims: claimsWithMemberships,
        localDepartments: local,
        localAccess: [],
        isSuperuser: false,
      })
    ).toBe(false);
    expect(
      canAccessDepartmentId({
        deptId: "999",
        claims: claimsWithMemberships,
        localDepartments: local,
        localAccess: [],
        isSuperuser: true,
      })
    ).toBe(true);
  });

  it("getClaimDepartments falls back to memberships when flat list missing", () => {
    const slim = {
      navio_memberships: claimsWithMemberships.navio_memberships,
    } as Partial<NavioClaims>;
    expect(getClaimDepartments(slim)).toHaveLength(3);
  });

  it("summarizeClaimScope exposes membership graph for diagnostics", () => {
    const s = summarizeClaimScope(claimsWithMemberships);
    expect(s.membershipCount).toBe(2);
    expect(s.departmentCount).toBe(3);
    expect(s.memberships[0]?.departments).toHaveLength(2);
  });

  it("getEffectiveScope builds org+dept lists and isEmpty", () => {
    const scope = getEffectiveScope({ claims: claimsWithMemberships });
    expect(scope.isSuperuser).toBe(false);
    expect(scope.isEmpty).toBe(false);
    expect(scope.organizations.map((o) => o.navioId).sort()).toEqual([1, 2]);
    expect(scope.departments.map((d) => d.navioId).sort()).toEqual([10, 11, 20]);
  });

  it("resolveApiDepartmentIds expands empty selection for non-superuser", () => {
    const scope = getEffectiveScope({ claims: claimsWithMemberships });
    expect(resolveApiDepartmentIds([], scope).sort((a, b) => a - b)).toEqual([10, 11, 20]);
    expect(resolveApiDepartmentIds([10, 999], scope)).toEqual([10]);
  });

  it("resolveApiDepartmentIds leaves empty for superuser", () => {
    const scope = getEffectiveScope({
      claims: { navio_active_roles: ["owner_superuser"] },
      localRoles: [{ organization_id: null, role: "owner_superuser" }],
    });
    expect(scope.isSuperuser).toBe(true);
    expect(resolveApiDepartmentIds([], scope)).toEqual([]);
  });

  it("supporthub.admin permission is network superuser", () => {
    const scope = getEffectiveScope({
      claims: {
        navio_permissions: ["supporthub.admin"],
        navio_roles: ["roles/supporthub.admin"],
      },
    });
    expect(scope.isSuperuser).toBe(true);
    expect(resolveApiDepartmentIds([], scope)).toEqual([]);
  });

  it("roles/superuser is network superuser without forceSuperuser", () => {
    const scope = getEffectiveScope({
      claims: { navio_roles: ["roles/superuser"] },
    });
    expect(scope.isSuperuser).toBe(true);
  });

  it("does not treat leftover owner_superuser as superuser when IAM graph exists", () => {
    const scope = getEffectiveScope({
      claims: {
        navio_permissions: ["bookings.list"],
        navio_active_roles: ["owner_superuser"],
      },
      localRoles: [{ organization_id: null, role: "super_admin" }],
    });
    expect(scope.isSuperuser).toBe(false);
  });

  it("forceSuperuser (e.g. Google employee) is unrestricted", () => {
    const scope = getEffectiveScope({
      claims: {},
      forceSuperuser: true,
    });
    expect(scope.isSuperuser).toBe(true);
    expect(resolveApiDepartmentIds([], scope)).toEqual([]);
    expect(resolveApiDepartmentIds([1, 2, 3], scope)).toEqual([1, 2, 3]);
  });

  it("clampDepartmentIds drops out-of-scope ids", () => {
    const scope = getEffectiveScope({ claims: claimsWithMemberships });
    expect(clampDepartmentIds([10, 999, 20], scope).sort((a, b) => a - b)).toEqual([10, 20]);
  });

  it("clampOrgId and pickDefaultOrgId", () => {
    const scope = getEffectiveScope({ claims: claimsWithMemberships });
    expect(clampOrgId("1", scope)).toBe(1);
    expect(clampOrgId(2, scope)).toBe(2);
    expect(clampOrgId("999", scope)).toBeNull();
    expect(pickDefaultOrgId(scope, claimsWithMemberships)).toBe(1);
  });

  it("canAccessOrganizationId from memberships", () => {
    expect(
      canAccessOrganizationId({
        orgId: "1",
        claims: claimsWithMemberships,
        localOrganizations: [],
        localRoles: [],
        isSuperuser: false,
      })
    ).toBe(true);
    expect(
      canAccessOrganizationId({
        orgId: "tronderdekk",
        claims: claimsWithMemberships,
        localOrganizations: [],
        localRoles: [],
        isSuperuser: false,
      })
    ).toBe(true);
    expect(
      canAccessOrganizationId({
        orgId: "nope",
        claims: claimsWithMemberships,
        localOrganizations: [],
        localRoles: [],
        isSuperuser: false,
      })
    ).toBe(false);
  });

  it("local org role without claims grants org UUID access", () => {
    expect(
      canAccessOrganizationId({
        orgId: "org-uuid",
        claims: {},
        localOrganizations: [
          {
            id: "org-uuid",
            display_name: "Local",
            slug: "local",
            navio_organization_id: null,
          },
        ],
        localRoles: [{ organization_id: "org-uuid", role: "org_user" }],
        isSuperuser: false,
      })
    ).toBe(true);
  });
});
