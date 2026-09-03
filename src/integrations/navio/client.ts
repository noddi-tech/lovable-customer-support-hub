import { supabase } from "@/integrations/supabase/client"

/**
 * Thin browser-side wrapper over the Noddi/Navio edge-function proxies.
 *
 * The Noddi API is never called directly from the browser — every request goes
 * through a `noddi-*` edge function that holds the service token. This module
 * only handles invocation and error shape; business logic lives in hooks.
 */
export class NavioError extends Error {
  constructor(
    message: string,
    readonly fn: string,
    readonly detail?: unknown,
  ) {
    super(message)
    this.name = "NavioError"
  }
}

/** Invokes a `noddi-*` edge function and throws a `NavioError` on failure. */
export async function invokeNavio<T = unknown>(
  fn: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body })

  // supabase.functions.invoke does not throw on HTTP 500 — always check `error`.
  if (error) throw new NavioError(error.message || `${fn} failed`, fn, error)

  const maybe = data as { error?: unknown } | null
  if (maybe && typeof maybe === "object" && "error" in maybe && maybe.error) {
    throw new NavioError(String(maybe.error), fn, maybe)
  }

  return data
}
