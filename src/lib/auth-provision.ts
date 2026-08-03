import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Supabase custom OIDC provider id for Authentik (auth.noddi.co). */
const AUTHENTIK_PROVIDERS = new Set(["navio", "custom:navio"]);

/**
 * True when this Supabase user authenticated via Authentik
 * (`Sign in with Navio` → custom OIDC provider `navio`).
 *
 * Upstream, only Django superusers can complete the navio-core source
 * authorize on api.noddi.co, and the Authentik Support Hub application
 * rejects non-internal (non-navio-core) users.
 */
export function isAuthentikNavioUser(user: User | null | undefined): boolean {
  if (!user) return false;

  const appMeta = user.app_metadata as {
    provider?: string;
    providers?: string[];
  } | null;

  if (appMeta?.provider && AUTHENTIK_PROVIDERS.has(appMeta.provider)) {
    return true;
  }
  if (appMeta?.providers?.some((p) => AUTHENTIK_PROVIDERS.has(p))) {
    return true;
  }

  const identities = user.identities ?? [];
  if (identities.some((i) => AUTHENTIK_PROVIDERS.has(i.provider))) {
    return true;
  }

  const providerStr = JSON.stringify(appMeta ?? {});
  return providerStr.includes("navio");
}

/**
 * Ensure an Authentik-authenticated user has a Support Hub profile +
 * `super_admin` role. No-op for non-Authentik sessions.
 */
export async function ensureAuthentikSupportHubAccess(
  user: User
): Promise<unknown> {
  if (!isAuthentikNavioUser(user)) {
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

  console.info("[auth] Authentik session provisioned for Support Hub super_admin", {
    userId: user.id,
    email: user.email,
  });
  return data;
}
