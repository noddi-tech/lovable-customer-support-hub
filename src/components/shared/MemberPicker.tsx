import type React from "react"
import { useMemo } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getRecentAssigneeIds, rememberAssignee } from "@/hooks/useConversationAssignActions"
import { type TeamMember, useTeamMembers } from "@/hooks/useTeamMembers"

export { rememberAssignee }

/** Display name used everywhere a team member is listed. */
export const memberLabel = (member: TeamMember) => member.full_name || member.email || ""

/** Single-letter avatar fallback. */
export const memberInitial = (member: TeamMember) =>
  (member.full_name || member.email || "?").trim().charAt(0).toUpperCase()

/**
 * Filters the team roster by name / email and optionally splits out the
 * recently used assignees. Shared by every "assign to…" picker.
 */
export function useMemberSearch(search: string, options?: { withRecent?: boolean }) {
  const { data: members = [] } = useTeamMembers()
  const withRecent = options?.withRecent ?? true

  return useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = members.filter(
      (m) =>
        !q ||
        (m.full_name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q),
    )

    if (!withRecent) return { members: matches, recent: [] as TeamMember[], rest: matches }

    const recent = getRecentAssigneeIds()
      .map((id) => matches.find((m) => m.id === id))
      .filter((m): m is TeamMember => Boolean(m))
    const recentIds = new Set(recent.map((m) => m.id))
    return { members: matches, recent, rest: matches.filter((m) => !recentIds.has(m.id)) }
  }, [members, search, withRecent])
}

/** Avatar + name, shared by every team-member option row. */
export const MemberOptionContent: React.FC<{ member: TeamMember }> = ({ member }) => (
  <>
    <Avatar className="h-5 w-5">
      <AvatarImage src={member.avatar_url || undefined} />
      <AvatarFallback className="text-[10px]">{memberInitial(member)}</AvatarFallback>
    </Avatar>
    <span className="min-w-0 flex-1 truncate">{memberLabel(member)}</span>
  </>
)
