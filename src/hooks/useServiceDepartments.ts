import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

/**
 * Service departments are owned by the Navio backend API — they are NOT a model
 * in this service. Everything that needs a service department (ops tickets,
 * inbox mapping, filters) must use this single hook so we share one cache entry
 * and one upstream call.
 *
 * The list changes rarely, so it is cached for hours and refetched in the
 * background when it goes stale (or after a reconnect).
 */
export interface ServiceDepartment {
  id: number
  name: string
}

export const serviceDepartmentsQueryKey = ["service-departments"] as const

export async function fetchServiceDepartments(): Promise<ServiceDepartment[]> {
  const { data, error } = await supabase.functions.invoke("noddi-tickets", {
    body: { action: "departments" },
  })
  if (error) throw new Error(error.message || "Failed to load service departments")
  if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
    throw new Error(String((data as { error: string }).error))
  }
  const payload = data as { results?: ServiceDepartment[] } | ServiceDepartment[] | null
  const list = Array.isArray(payload) ? payload : (payload?.results ?? [])
  return list
    .map((d) => ({ id: d.id, name: d.name ?? `Department ${d.id}` }))
    .sort((a, b) => a.name.localeCompare(b.name, "nb"))
}

export function useServiceDepartments() {
  return useQuery({
    queryKey: serviceDepartmentsQueryKey,
    queryFn: fetchServiceDepartments,
    staleTime: 6 * 60 * 60_000, // 6 hours
    gcTime: 24 * 60 * 60_000, // keep in the persisted cache for a day
    refetchOnReconnect: true,
    retry: 1,
  })
}

/** Convenience lookup: navio department id → name. */
export function useServiceDepartmentName(id: number | null | undefined) {
  const { data } = useServiceDepartments()
  if (id == null) return null
  return data?.find((d) => d.id === id)?.name ?? null
}
