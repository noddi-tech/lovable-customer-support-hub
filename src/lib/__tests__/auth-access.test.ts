import { describe, expect, it } from "vitest";
import {
	hasSupportHubAccessPermission,
	hasSupportHubNavioAccess,
	isIamSupportHubAdmin,
	isNetworkSuperuser,
	SUPPORTHUB_ACCESS,
	SUPPORTHUB_ADMIN,
} from "@/lib/auth-access";

describe("hasSupportHubNavioAccess", () => {
	it("allows supporthub.access on the token", () => {
		expect(
			hasSupportHubNavioAccess({ navio_permissions: [SUPPORTHUB_ACCESS] }),
		).toBe(true);
	});

	it("allows supporthub.admin on the token", () => {
		expect(
			hasSupportHubNavioAccess({ navio_permissions: [SUPPORTHUB_ADMIN] }),
		).toBe(true);
	});

	it("allows roles/superuser from IAM", () => {
		expect(hasSupportHubNavioAccess({ navio_roles: ["roles/superuser"] })).toBe(
			true,
		);
	});

	it("denies other IAM permissions without supporthub.access", () => {
		expect(
			hasSupportHubNavioAccess({ navio_permissions: ["bookings.list"] }),
		).toBe(false);
	});

	it("allows legacy owner_superuser when there is no IAM graph", () => {
		expect(
			hasSupportHubNavioAccess({ navio_active_roles: ["owner_superuser"] }),
		).toBe(true);
	});

	it("does not treat owner_superuser as access when IAM graph lacks supporthub.access", () => {
		expect(
			hasSupportHubNavioAccess({
				navio_permissions: ["bookings.list"],
				navio_active_roles: ["owner_superuser"],
			}),
		).toBe(false);
	});
});

describe("isNetworkSuperuser", () => {
	it("treats supporthub.admin as network admin", () => {
		expect(
			isNetworkSuperuser(null, { navio_permissions: [SUPPORTHUB_ADMIN] }, []),
		).toBe(true);
		expect(
			isIamSupportHubAdmin({ navio_permissions: [SUPPORTHUB_ADMIN] }),
		).toBe(true);
	});

	it("treats roles/superuser as network admin", () => {
		expect(
			isNetworkSuperuser(null, { navio_roles: ["roles/superuser"] }, []),
		).toBe(true);
		expect(isIamSupportHubAdmin({ navio_roles: ["roles/superuser"] })).toBe(
			true,
		);
	});

	it("does not treat access-only as network admin", () => {
		expect(
			isNetworkSuperuser(null, { navio_permissions: [SUPPORTHUB_ACCESS] }, []),
		).toBe(false);
		expect(
			hasSupportHubAccessPermission({ navio_permissions: [SUPPORTHUB_ACCESS] }),
		).toBe(true);
	});

	it("allows local super_admin when there is no IAM graph", () => {
		expect(
			isNetworkSuperuser(null, {}, [
				{ role: "super_admin", organization_id: null },
			]),
		).toBe(true);
	});

	it("allows noddi Google fallback only when there is no IAM graph", () => {
		expect(isNetworkSuperuser(null, {}, [], true)).toBe(true);
		expect(
			isNetworkSuperuser(
				null,
				{ navio_permissions: ["bookings.list"] },
				[],
				true,
			),
		).toBe(false);
	});
});
