import { type UseQueryOptions, useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { sortInboxesByName } from "@/lib/sortInboxes"

export interface InboxRecord {
  id: string
  name: string
  color?: string | null
  description?: string | null
  department_id?: string | null
  is_active?: boolean | null
  [key: string]: unknown
}

/** Fetches every inbox the current user can access, sorted by name. */
export async function fetchInboxes(): Promise<InboxRecord[]> {
  const { data, error } = await supabase.rpc("get_inboxes")
  if (error) throw error
  return sortInboxesByName((data || []) as unknown as InboxRecord[])
}

/**
 * Single source of truth for the inbox list used by every inbox dropdown,
 * sidebar and settings screen. Shares one `['inboxes']` cache entry so the
 * existing `invalidateQueries({ queryKey: ['inboxes'] })` calls refresh them all.
 */
export function useInboxes<T = InboxRecord[]>(
  options?: Omit<UseQueryOptions<InboxRecord[], Error, T>, "queryKey" | "queryFn">,
) {
  return useQuery<InboxRecord[], Error, T>({
    queryKey: ["inboxes"],
    queryFn: fetchInboxes,
    ...options,
  })
}
