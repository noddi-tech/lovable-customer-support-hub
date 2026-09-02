import { Check, CircleDot, Flag, UserMinus, UserPlus } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import {
  CASE_PRIORITY_DOT,
  CASE_STATUS_ICON_COLORS,
  CASE_STATUS_ICONS,
} from "@/components/cases/CaseBadges"
import {
  MemberOptionContent,
  memberLabel,
  rememberAssignee,
  useMemberSearch,
} from "@/components/shared/MemberPicker"
import { TagContextMenuItems } from "@/components/tags/TagContextMenuItems"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import {
  CASE_PRIORITY_LABELS,
  CASE_STATUS_LABELS,
  type CasePriority,
  type CaseStatus,
  useUpdateCase,
} from "@/hooks/useCases"
import type { TeamMember } from "@/hooks/useTeamMembers"

interface CaseContextMenuProps {
  caseId: string
  status: CaseStatus
  priority: CasePriority
  ownerId?: string | null
  children: React.ReactNode
}

/** Right-click menu on a case row: quick assign owner, change status or priority. */
export const CaseContextMenu: React.FC<CaseContextMenuProps> = ({
  caseId,
  status,
  priority,
  ownerId,
  children,
}) => {
  const { mutateAsync: updateCase } = useUpdateCase()
  const [search, setSearch] = useState("")
  const { recent, rest } = useMemberSearch(search)

  const assignOwner = (member: TeamMember) => {
    rememberAssignee(member.id)
    return apply({ owner_id: member.id }, `Assigned to ${memberLabel(member)}`)
  }

  const apply = async (updates: Record<string, unknown>, message: string) => {
    await updateCase({ id: caseId, updates })
    toast.success(message)
  }

  return (
    <ContextMenu onOpenChange={(open) => !open && setSearch("")}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="text-xs text-muted-foreground">Assign owner</ContextMenuLabel>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign to…
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64 p-0">
            <div className="p-2">
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search people…"
                className="h-8 text-sm"
              />
            </div>
            <div className="max-h-64 overflow-y-auto pb-1">
              {recent.length > 0 && (
                <>
                  <ContextMenuLabel className="px-3 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    Recent
                  </ContextMenuLabel>
                  {recent.map((member) => (
                    <ContextMenuItem
                      key={`recent-${member.id}`}
                      className="gap-2"
                      onSelect={() => assignOwner(member)}
                    >
                      <MemberOptionContent member={member} />
                      {ownerId === member.id && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                      )}
                    </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                </>
              )}
              {rest.map((member) => (
                <ContextMenuItem
                  key={member.id}
                  className="gap-2"
                  onSelect={() => assignOwner(member)}
                >
                  <MemberOptionContent member={member} />
                  {ownerId === member.id && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </ContextMenuItem>
              ))}

              {recent.length === 0 && rest.length === 0 && (
                <div className="px-3 py-4 text-sm text-muted-foreground">No people found</div>
              )}
            </div>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => apply({ owner_id: null }, "Owner cleared")}>
              <UserMinus className="mr-2 h-4 w-4" />
              Unassign
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        <ContextMenuLabel className="text-xs text-muted-foreground">Status</ContextMenuLabel>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <CircleDot className="mr-2 h-4 w-4" />
            Change status
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-52">
            {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((value) => {
              const Icon = CASE_STATUS_ICONS[value]
              return (
                <ContextMenuItem
                  key={value}
                  disabled={status === value}
                  onSelect={() =>
                    apply({ status: value }, `Status set to ${CASE_STATUS_LABELS[value]}`)
                  }
                >
                  <Icon className={`mr-2 h-4 w-4 ${CASE_STATUS_ICON_COLORS[value]}`} />
                  <span className="flex-1">{CASE_STATUS_LABELS[value]}</span>
                  {status === value && <Check className="h-3.5 w-3.5 text-primary" />}
                </ContextMenuItem>
              )
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuLabel className="text-xs text-muted-foreground">Priority</ContextMenuLabel>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Flag className="mr-2 h-4 w-4" />
            Change priority
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {(Object.keys(CASE_PRIORITY_LABELS) as CasePriority[]).map((value) => (
              <ContextMenuItem
                key={value}
                disabled={priority === value}
                onSelect={() =>
                  apply({ priority: value }, `Priority set to ${CASE_PRIORITY_LABELS[value]}`)
                }
              >
                <span
                  aria-hidden
                  className={`mr-2 h-2 w-2 rounded-full ${CASE_PRIORITY_DOT[value]}`}
                />
                <span className="flex-1">{CASE_PRIORITY_LABELS[value]}</span>
                {priority === value && <Check className="h-3.5 w-3.5 text-primary" />}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        <ContextMenuLabel className="text-xs text-muted-foreground">Tags</ContextMenuLabel>
        <TagContextMenuItems entityType="case" entityId={caseId} />
      </ContextMenuContent>
    </ContextMenu>
  )
}
