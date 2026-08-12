import {
  isNavioCoreOidcUser,
  PRODUCT_OIDC_ISSUER,
} from "@navio/zidp";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Shared product IdP detection + issuer constants live in `@navio/zidp`.
export { isNavioCoreOidcUser, PRODUCT_OIDC_ISSUER };
/** @deprecated Use {@link isNavioCoreOidcUser} */
export { isAuthentikNavioUser } from "@navio/zidp";

/**
 * Ensure a product IdP (`custom:navio` → {@link PRODUCT_OIDC_ISSUER}) session
 * has a Support Hub profile + `super_admin` role. No-op for other providers.
 *
 * Upstream authorize gate: OIDC client name `navio-support-hub` is restricted
 * to Django superusers on navio-core. RPC name is historical (Supabase).
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

  console.info("[auth] Navio Core session provisioned for Support Hub super_admin", {
    userId: user.id,
    email: user.email,
  });
  return data;
}

/** @deprecated Use {@link ensureNavioSupportHubAccess} */
export const ensureAuthentikSupportHubAccess = ensureNavioSupportHubAccess;
