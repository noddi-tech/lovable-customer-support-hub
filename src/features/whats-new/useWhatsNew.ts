import { useCallback, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/AuthContext"
import { ANNOUNCEMENTS, type Announcement } from "./announcements"

const storageKey = (userId: string) => `whats-new:seen:${userId}`

const readSeen = (userId: string): string[] => {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []
  } catch {
    return []
  }
}

const writeSeen = (userId: string, ids: string[]) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(new Set(ids))))
  } catch {
    /* storage unavailable — ignore */
  }
}

/**
 * Returns the announcements the current user has never seen, and a way to
 * permanently dismiss them (per user, stored locally).
 */
export function useWhatsNew() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [seen, setSeen] = useState<string[] | null>(null)

  useEffect(() => {
    if (!userId) {
      setSeen(null)
      return
    }
    setSeen(readSeen(userId))
  }, [userId])

  const unseen: Announcement[] = useMemo(() => {
    if (!userId || seen === null) return []
    return ANNOUNCEMENTS.filter((a) => !seen.includes(a.id))
  }, [userId, seen])

  const dismiss = useCallback(
    (ids: string[] = ANNOUNCEMENTS.map((a) => a.id)) => {
      if (!userId) return
      setSeen((prev) => {
        const next = Array.from(new Set([...(prev ?? []), ...ids]))
        writeSeen(userId, next)
        return next
      })
    },
    [userId],
  )

  return { unseen, dismiss, ready: seen !== null }
}
