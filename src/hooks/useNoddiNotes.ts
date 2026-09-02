import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

/**
 * Notes that live in Noddi (`/v1/user-group-notes/`). The Support Hub never
 * stores these locally — Noddi is the source of truth so both systems show the
 * same note list.
 */
export interface NoddiNote {
  id: number
  content: string
  created_at: string
  updated_at: string | null
  author_name: string | null
}

const firstString = (...values: unknown[]): string | null => {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v
  }
  return null
}

/** Noddi paginates differently per endpoint version, so accept every shape. */
function extractItems(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.results)) return payload.results
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.items)) return payload.items
  return []
}

export function normalizeNoddiNote(raw: any): NoddiNote | null {
  const id = Number(raw?.id)
  if (!Number.isFinite(id)) return null
  const content = firstString(raw?.note, raw?.content, raw?.text, raw?.body, raw?.message) ?? ""
  const author =
    firstString(
      raw?.created_by_name,
      raw?.author_name,
      raw?.created_by?.name,
      raw?.created_by?.full_name,
      raw?.user?.name,
      typeof raw?.created_by === "string" ? raw.created_by : undefined,
    ) ?? null
  return {
    id,
    content,
    created_at:
      firstString(raw?.created_at, raw?.created, raw?.timestamp) ?? new Date().toISOString(),
    updated_at: firstString(raw?.updated_at, raw?.modified_at),
    author_name: author,
  }
}

async function invokeNoddiNotes(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("noddi-notes", { body })
  // functions.invoke does not throw on non-2xx — always inspect `error`.
  if (error) throw new Error(error.message || "Noddi notes request failed")
  if (data && typeof data === "object" && "error" in (data as any)) {
    throw new Error(String((data as any).error))
  }
  return data
}

/** Resolves the Noddi user group for a Support Hub customer via the lookup cache. */
export function useNoddiUserGroupIdForCustomer(customerId?: string | null) {
  return useQuery({
    queryKey: ["noddi-notes", "user-group", customerId],
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: customer } = await (supabase.from("customers") as any)
        .select("email, phone")
        .eq("id", customerId)
        .maybeSingle()
      const email = (customer?.email as string | undefined)?.toLowerCase().trim()
      const phone = (customer?.phone as string | undefined)?.trim()
      if (!email && !phone) return null

      let query = (supabase.from("noddi_customer_cache") as any)
        .select("user_group_id")
        .not("user_group_id", "is", null)
        .limit(1)
      query = email ? query.ilike("email", email) : query.eq("phone", phone)
      const { data } = await query.maybeSingle()
      const id = Number(data?.user_group_id)
      return Number.isFinite(id) && id > 0 ? id : null
    },
  })
}

export function useNoddiNotes(userGroupId?: number | null) {
  return useQuery({
    queryKey: ["noddi-notes", "list", userGroupId],
    enabled: !!userGroupId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const data = await invokeNoddiNotes({ action: "list", user_group_id: userGroupId })
      return extractItems(data)
        .map(normalizeNoddiNote)
        .filter((n): n is NoddiNote => !!n && !!n.content)
    },
    // Noddi outages should not break the notes panel — fall back to an empty list.
    retry: 1,
  })
}

export const noddiNotesApi = {
  create: (userGroupId: number, content: string) =>
    invokeNoddiNotes({ action: "create", user_group_id: userGroupId, content }),
  update: (noteId: number, content: string) =>
    invokeNoddiNotes({ action: "update", note_id: noteId, content }),
  remove: (noteId: number) => invokeNoddiNotes({ action: "delete", note_id: noteId }),
}

export const NODDI_NOTE_PREFIX = "noddi:"
export const isNoddiNoteId = (id: string) => id.startsWith(NODDI_NOTE_PREFIX)
export const toNoddiNoteId = (id: number) => `${NODDI_NOTE_PREFIX}${id}`
export const parseNoddiNoteId = (id: string) => Number(id.slice(NODDI_NOTE_PREFIX.length))
