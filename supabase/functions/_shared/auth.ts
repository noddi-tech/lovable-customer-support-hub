// Shared authentication / authorization helpers for edge functions.
// Fail-closed: every helper returns a Response on failure that the caller must return.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "./cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? ""

export interface AuthedUser {
  id: string
  email: string | null
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

export function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}

/** Extracts a bearer token from the Authorization header, or a `?token=` query param. */
export function extractToken(req: Request): string | null {
  const header = req.headers.get("Authorization")
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim()
    // The anon/publishable key is not a user token.
    if (token && token !== ANON_KEY) return token
  }
  const token = new URL(req.url).searchParams.get("token")
  return token && token !== ANON_KEY ? token : null
}

/** Resolves the calling user, or returns a 401 Response. */
export async function requireUser(
  req: Request,
): Promise<{ user: AuthedUser } | { response: Response }> {
  const token = extractToken(req)
  if (!token) return { response: json({ error: "Unauthorized" }, 401) }

  const admin = serviceClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return { response: json({ error: "Unauthorized" }, 401) }

  return { user: { id: data.user.id, email: data.user.email ?? null } }
}

export interface AdminContext extends AuthedUser {
  isSuperAdmin: boolean
  organizationIds: string[]
}

/**
 * Resolves the calling user and asserts they are an org admin or super admin.
 * When `organizationId` is provided, the user must be an admin *of that org*.
 */
export async function requireAdmin(
  req: Request,
  organizationId?: string | null,
): Promise<{ admin: AdminContext } | { response: Response }> {
  const result = await requireUser(req)
  if ("response" in result) return result

  const client = serviceClient()
  const { data: roles } = await client
    .from("user_roles")
    .select("role, organization_id")
    .eq("user_id", result.user.id)

  const isSuperAdmin = (roles ?? []).some((r: { role: string }) => r.role === "super_admin")

  const { data: memberships } = await client
    .from("organization_memberships")
    .select("organization_id, role, status")
    .eq("user_id", result.user.id)
    .eq("status", "active")

  const adminOrgs = (memberships ?? [])
    .filter((m: { role: string }) => m.role === "admin" || m.role === "super_admin")
    .map((m: { organization_id: string }) => m.organization_id)

  const allowed = isSuperAdmin
    ? true
    : organizationId
      ? adminOrgs.includes(organizationId)
      : adminOrgs.length > 0

  if (!allowed) return { response: json({ error: "Forbidden: admin access required" }, 403) }

  return {
    admin: { ...result.user, isSuperAdmin, organizationIds: adminOrgs },
  }
}

/** True when the request is signed with the service-role key (trusted internal caller). */
export function isServiceRoleRequest(req: Request): boolean {
  if (!SERVICE_ROLE_KEY) return false
  const header = req.headers.get("Authorization") ?? ""
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const apikey = req.headers.get("apikey")?.trim() ?? ""
  return bearer === SERVICE_ROLE_KEY || apikey === SERVICE_ROLE_KEY
}

export interface MemberContext extends AuthedUser {
  isSuperAdmin: boolean
  organizationIds: string[]
}

/**
 * Resolves the calling user and asserts they are an active member of `organizationId`.
 * Super admins pass for any org. Service-role callers bypass entirely.
 */
export async function requireOrgMember(
  req: Request,
  organizationId: string,
): Promise<{ member: MemberContext } | { response: Response }> {
  if (isServiceRoleRequest(req)) {
    return {
      member: {
        id: "service-role",
        email: null,
        isSuperAdmin: true,
        organizationIds: [organizationId],
      },
    }
  }

  const result = await requireUser(req)
  if ("response" in result) return result

  const client = serviceClient()
  const { data: roles } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", result.user.id)

  const isSuperAdmin = (roles ?? []).some((r: { role: string }) => r.role === "super_admin")

  const { data: memberships } = await client
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", result.user.id)
    .eq("status", "active")

  const orgIds = (memberships ?? []).map((m: { organization_id: string }) => m.organization_id)

  if (!isSuperAdmin && !orgIds.includes(organizationId)) {
    return { response: json({ error: "Forbidden: not a member of this organization" }, 403) }
  }

  return { member: { ...result.user, isSuperAdmin, organizationIds: orgIds } }
}
