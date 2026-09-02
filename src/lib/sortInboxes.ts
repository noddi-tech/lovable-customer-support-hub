/**
 * Sort inboxes alphabetically by name (locale-aware, Norwegian collation).
 * Used everywhere inboxes are listed so ordering is consistent across the app.
 */
export function sortInboxesByName<T extends { name?: string | null }>(
  inboxes: T[] | null | undefined,
): T[] {
  return [...(inboxes || [])].sort((a, b) =>
    (a?.name || "").localeCompare(b?.name || "", "nb", { sensitivity: "base" }),
  )
}
