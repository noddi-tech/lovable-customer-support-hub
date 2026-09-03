import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Check, CheckCheck, Clock, Lock } from "lucide-react"
import type React from "react"
import { useMemo } from "react"
import { PresenceAvatarStack } from "@/components/conversations/PresenceAvatarStack"
import { BrandBadge } from "@/components/dashboard/conversation-list/BrandBadge"
import { ConversationStatusContextMenu } from "@/components/dashboard/conversation-list/ConversationStatusContextMenu"
import { TagBadgeList } from "@/components/tags/TagBadge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useEntityTags } from "@/hooks/useEntityTags"
import { useNoddihKundeData } from "@/hooks/useNoddihKundeData"
import { getConversationBrand } from "@/lib/conversationBrand"
import { formatCountdown } from "@/lib/sla"
import { cn } from "@/lib/utils"

/** Chats due within this window are flagged as about to breach. */
const SLA_AT_RISK_WINDOW_MS = 60 * 60 * 1000

interface ChatConversation {
  id: string
  subject: string | null
  preview_text: string | null
  status: string
  updated_at: string
  is_read: boolean
  metadata?: unknown
  sla_breach_at?: string | null
  last_message_is_internal?: boolean
  customer: {
    id: string
    full_name: string | null
    email: string | null
  } | null
  session?: {
    id: string
    status: string
    visitor_name: string | null
    visitor_email: string | null
  } | null
  source?: "live" | "ai"
  ai_status?: string
  is_escalated?: boolean
}

interface ChatListItemProps {
  conv: ChatConversation
  isSelected: boolean
  onSelect: () => void
  /** True when the chat is ticked for a bulk action. */
  isBulkSelected?: boolean
  /** Shown once at least one chat is ticked. */
  selectionMode?: boolean
  /** Cmd/Ctrl-click toggles one chat, Shift-click selects the range. */
  onBulkSelect?: (id: string, selected: boolean, shiftKey?: boolean) => void
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  conv,
  isSelected,
  onSelect,
  isBulkSelected = false,
  selectionMode = false,
  onBulkSelect,
}) => {
  const customerName = conv.session?.visitor_name || conv.customer?.full_name || "Visitor"
  const customerEmail = conv.session?.visitor_email || conv.customer?.email
  const isAi = conv.source === "ai"
  const isEscalated = !!conv.is_escalated
  const isAiAssigned = isAi && conv.ai_status === "assigned"
  const isWaiting = conv.session?.status === "waiting"
  const isActive = conv.session?.status === "active"
  const initial = customerName.charAt(0).toUpperCase()
  const brand = getConversationBrand(conv.metadata, "widget")
  const { getTags } = useEntityTags("conversation")

  // SLA badge: red once the deadline has passed, orange when it is close.
  const slaState = useMemo(() => {
    if (!conv.sla_breach_at) return null
    if (conv.status === "closed" || conv.status === "resolved") return null
    const due = new Date(conv.sla_breach_at).getTime()
    if (!Number.isFinite(due)) return null
    const remaining = due - Date.now()
    if (remaining > SLA_AT_RISK_WINDOW_MS) return null
    return {
      breached: remaining <= 0,
      countdown: formatCountdown(remaining),
      dueLabel: new Date(due).toLocaleString(),
    }
  }, [conv.sla_breach_at, conv.status])
  const chatTags = getTags(conv.id)

  // Create customer object for Noddi lookup
  const customer = useMemo(
    () => ({
      id: conv.customer?.id || conv.id,
      email: customerEmail || undefined,
      phone: undefined,
      full_name: customerName,
    }),
    [conv.customer?.id, conv.id, customerEmail, customerName],
  )

  // Noddi customer lookup
  const { data: noddiData } = useNoddihKundeData(customer)
  const isNoddiCustomer = noddiData?.data?.found

  return (
    <ConversationStatusContextMenu
      conversationId={conv.id}
      status={conv.status}
      brandLabel={brand?.label ?? null}
    >
      <button
        type="button"
        onClick={(e) => {
          const modifierSelect = e.metaKey || e.ctrlKey || e.shiftKey
          if (onBulkSelect && (selectionMode || modifierSelect)) {
            e.preventDefault()
            window.getSelection?.()?.removeAllRanges()
            onBulkSelect(conv.id, !isBulkSelected, e.shiftKey)
            return
          }
          onSelect()
        }}
        className={cn(
          "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-200",
          isSelected
            ? "bg-accent border-accent-foreground/20 shadow-sm"
            : "hover:bg-muted/50 border-transparent",
          isBulkSelected && "ring-1 ring-primary bg-primary/10",
          !conv.is_read && "bg-primary/5",
        )}
      >
        {selectionMode && (
          <fieldset
            className="pt-1 shrink-0 border-0 p-0 m-0 min-w-0"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isBulkSelected}
              onCheckedChange={(checked) => onBulkSelect?.(conv.id, checked === true)}
              aria-label="Select chat"
            />
          </fieldset>
        )}
        {/* Avatar with status indicator */}
        <div className="relative shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarFallback
              className={cn(
                "text-sm font-medium",
                isNoddiCustomer
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-primary/10",
              )}
            >
              {initial}
            </AvatarFallback>
          </Avatar>
          {/* Status dot */}
          {(isWaiting || isActive || isEscalated || isAiAssigned) && (
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                isWaiting || isEscalated ? "bg-yellow-500 animate-pulse" : "bg-green-500",
              )}
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn("text-sm truncate", !conv.is_read ? "font-semibold" : "font-medium")}
            >
              {customerName}
            </span>
            {brand && <BrandBadge brand={brand} compact />}
            <TagBadgeList tags={chatTags} compact max={2} />
            {isNoddiCustomer && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                Noddi
              </Badge>
            )}
            {isAi && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800"
              >
                AI
              </Badge>
            )}
            {isEscalated && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-red-50 text-red-700 border-red-300 animate-pulse dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
              >
                Needs human
              </Badge>
            )}
            {isAiAssigned && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                With agent
              </Badge>
            )}
            {isWaiting && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-700 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
              >
                WAITING
              </Badge>
            )}
            {isActive && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300 animate-pulse dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              >
                LIVE
              </Badge>
            )}
            {slaState && (
              <Badge
                variant="outline"
                title={
                  slaState.breached
                    ? `SLA breached ${slaState.countdown} ago (due ${slaState.dueLabel})`
                    : `SLA due in ${slaState.countdown} (${slaState.dueLabel})`
                }
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  slaState.breached
                    ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                    : "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
                )}
              >
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                {slaState.breached ? `SLA ${slaState.countdown} over` : `SLA ${slaState.countdown}`}
              </Badge>
            )}
            {conv.last_message_is_internal && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
              >
                <Lock className="h-3 w-3 mr-0.5" />
                Note
              </Badge>
            )}
            {(conv as any).last_message_sender_type === "customer" &&
              !conv.last_message_is_internal &&
              (conv.status === "open" || conv.status === "pending") && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800"
                >
                  <Clock className="h-3 w-3 mr-0.5" />
                  Awaiting reply
                </Badge>
              )}
          </div>
          {customerEmail && (
            <span className="text-xs text-muted-foreground truncate block">{customerEmail}</span>
          )}
          <div className="flex items-center gap-1 mt-1">
            {/* Delivery status indicator */}
            {conv.is_read ? (
              <CheckCheck className="h-3 w-3 text-primary shrink-0" />
            ) : (
              <Check className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
            <p className="text-xs text-muted-foreground line-clamp-1">
              {conv.preview_text || "No messages yet"}
            </p>
          </div>
        </div>

        {/* Time + presence + unread indicator */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              "text-[10px]",
              !conv.is_read ? "text-primary font-medium" : "text-muted-foreground",
            )}
          >
            {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}
          </span>
          <PresenceAvatarStack conversationId={conv.id} size="sm" maxAvatars={2} />
          {!conv.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
        </div>
      </button>
    </ConversationStatusContextMenu>
  )
}
