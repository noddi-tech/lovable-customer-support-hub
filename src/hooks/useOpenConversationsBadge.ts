import { useMemo } from "react"
import { useLocation } from "react-router-dom"
import { useDefaultInbox } from "./useDefaultInbox"
import { useFaviconBadge } from "./useFaviconBadge"
import { useInboxOutstandingCounts } from "./useInboxOutstandingCounts"

/**
 * Shows the number of open conversations in the user's default inbox on the
 * favicon / app badge. The inbox currently open in the URL wins; otherwise the
 * per-user default inbox is used, falling back to all inboxes combined.
 */
export function useOpenConversationsBadge() {
  const location = useLocation()
  const { data } = useInboxOutstandingCounts()
  const { defaultInboxId } = useDefaultInbox()

  const urlInboxId = useMemo(
    () => new URLSearchParams(location.search).get("inbox"),
    [location.search],
  )

  const inboxId = urlInboxId || defaultInboxId

  const count = useMemo(() => {
    if (!data) return 0
    if (inboxId) {
      return inboxId
        .split(",")
        .filter(Boolean)
        .reduce((sum, id) => sum + (data[id]?.open ?? 0), 0)
    }
    return Object.values(data).reduce((sum, c) => sum + c.open, 0)
  }, [data, inboxId])

  useFaviconBadge(count)

  return count
}
