import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

/**
 * Service organizations are owned by the Navio backend API — they are NOT a
 * model in this service. The Support Hub mirrors them locally (one local
 * organization row per Navio service organization) so tenants, inboxes and
 * memberships line up with the backend.
 *
 * Fetched on demand and cached for hours; once the cache expires the next
 * consumer triggers a refetch (the edge function keeps its own warm cache too).
 */
export interface ServiceOrganization {
  id: number
  name: string
}

export const serviceOrganizationsQueryKey = ["service-organizations"] as const

export async function fetchServiceOrganizations(): Promise<ServiceOrganization[]> {
  const { data, error } = await supabase.functions.invoke("noddi-tickets", {
    body: { action: "organizations" },
  })
  if (error) throw new Error(error.message || "Failed to load service organizations")
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
    throw new Error(String((data as { error: string }).error))
  }
  const payload = data as { results?: ServiceOrganization[] } | ServiceOrganization[] | null
  const list = Array.isArray(payload) ? payload : (payload?.results ?? [])
  return list
    .map((o) => ({ id: Number(o.id), name: o.name ?? `Organization ${o.id}` }))
    .filter((o) => Number.isFinite(o.id))
    .sort((a, b) => a.name.localeCompare(b.name, "nb"))
}

export function useServiceOrganizations() {
  return useQuery({
    queryKey: serviceOrganizationsQueryKey,
    queryFn: fetchServiceOrganizations,
    staleTime: 6 * 60 * 60_000, // 6 hours
    gcTime: 24 * 60 * 60_000,
    refetchOnReconnect: true,
    retry: 1,
  })
}

/** Convenience lookup: navio service organization id → name. */
export function useServiceOrganizationName(id: number | null | undefined) {
  const { data } = useServiceOrganizations()
  if (id == null) return null
  return data?.find((o) => o.id === id)?.name ?? null
}
