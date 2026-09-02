// Caller identification helpers shared by the Noddi proxy functions.
import { requireUser, serviceClient } from "./auth.ts"

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

/** True when the request carries the service-role key (internal function-to-function call). */
export function isServiceRoleRequest(req: Request): boolean {
  const header = req.headers.get("Authorization") ?? ""
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  return !!SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY
}

/** Validates an `x-widget-key` header against active widget configs. */
export async function isValidWidgetKey(req: Request): Promise<boolean> {
  const key = req.headers.get("x-widget-key")
  if (!key) return false
  const { data, error } = await serviceClient()
    .from("widget_configs")
    .select("id")
    .eq("widget_key", key)
    .eq("is_active", true)
    .maybeSingle()
  return !error && !!data
}

/**
 * Allows: internal service-role calls, signed-in dashboard users, or the public
 * widget when it presents a valid active widget key. Anything else is rejected.
 */
export async function isAllowedProxyCaller(req: Request): Promise<boolean> {
  if (isServiceRoleRequest(req)) return true
  if (await isValidWidgetKey(req)) return true
  const result = await requireUser(req)
  return !("response" in result)
}
