import { Briefcase } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { CaseSlaBadge, CaseStatusBadge } from "@/components/cases/CaseBadges"
import { useConversationCase } from "@/hooks/useCases"
import { cn } from "@/lib/utils"

interface HeaderCaseChipProps {
  conversationId?: string | null
  caseId?: string | null
  className?: string
}

/**
 * Compact "this thread belongs to case #123" chip for the conversation header.
 * Renders nothing when the conversation is not linked to a case.
 */
export function HeaderCaseChip({ conversationId, caseId, className }: HeaderCaseChipProps) {
  const navigate = useNavigate()
  const { data: linkedCase } = useConversationCase(conversationId ?? undefined, caseId)

  if (!linkedCase) return null

  return (
    <button
      type="button"
      onClick={() => navigate(`/operations/cases/${linkedCase.id}`)}
      title={`Case #${linkedCase.case_number} — ${linkedCase.title}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-accent",
        className,
      )}
    >
      <Briefcase className="h-3 w-3 text-muted-foreground" />
      <span className="font-mono text-[11px] text-muted-foreground">#{linkedCase.case_number}</span>
      <span className="hidden max-w-[160px] truncate font-medium sm:inline">
        {linkedCase.title}
      </span>
      <CaseStatusBadge status={linkedCase.status} />
      <CaseSlaBadge record={linkedCase} />
    </button>
  )
}
