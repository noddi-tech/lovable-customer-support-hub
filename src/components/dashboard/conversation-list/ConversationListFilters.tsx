import { useTranslation } from "react-i18next"
import { DescribedSelectItem } from "@/components/ui/described-select-item"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useConversationList } from "@/contexts/ConversationListContext"
import { CONVERSATION_STATUS_DESCRIPTIONS, PRIORITY_DESCRIPTIONS } from "@/lib/option-descriptions"

export const ConversationListFilters = () => {
  const { state, dispatch } = useConversationList()
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Select
        value={state.statusFilter}
        onValueChange={(value) => dispatch({ type: "SET_STATUS_FILTER", payload: value })}
      >
        <SelectTrigger className="w-32 h-9 text-xs md:text-sm">
          <SelectValue placeholder={t("dashboard.conversationList.allStatus", "All Status")} />
        </SelectTrigger>
        <SelectContent>
          <DescribedSelectItem value="all" description={CONVERSATION_STATUS_DESCRIPTIONS.all}>
            {t("dashboard.conversationList.allStatus", "All Status")}
          </DescribedSelectItem>
          <DescribedSelectItem
            value="open"
            title="Open"
            description={CONVERSATION_STATUS_DESCRIPTIONS.open}
          >
            {t("dashboard.conversationList.open", "Open")}
          </DescribedSelectItem>
          <DescribedSelectItem
            value="pending"
            title="Pending"
            description={CONVERSATION_STATUS_DESCRIPTIONS.pending}
          >
            {t("dashboard.conversationList.pending", "Pending")}
          </DescribedSelectItem>
          <DescribedSelectItem
            value="closed"
            title="Closed"
            description={CONVERSATION_STATUS_DESCRIPTIONS.closed}
          >
            {t("dashboard.conversationList.closed", "Closed")}
          </DescribedSelectItem>
        </SelectContent>
      </Select>

      <Select
        value={state.priorityFilter}
        onValueChange={(value) => dispatch({ type: "SET_PRIORITY_FILTER", payload: value })}
      >
        <SelectTrigger className="w-32 h-9 text-xs md:text-sm">
          <SelectValue placeholder={t("dashboard.conversationList.allPriority", "All Priority")} />
        </SelectTrigger>
        <SelectContent>
          <DescribedSelectItem value="all" description={PRIORITY_DESCRIPTIONS.all}>
            {t("dashboard.conversationList.allPriority", "All Priority")}
          </DescribedSelectItem>
          <DescribedSelectItem value="low" title="Low" description={PRIORITY_DESCRIPTIONS.low}>
            {t("dashboard.conversationList.low", "Low")}
          </DescribedSelectItem>
          <DescribedSelectItem
            value="normal"
            title="Normal"
            description={PRIORITY_DESCRIPTIONS.normal}
          >
            {t("dashboard.conversationList.normal", "Normal")}
          </DescribedSelectItem>
          <DescribedSelectItem value="high" title="High" description={PRIORITY_DESCRIPTIONS.high}>
            {t("dashboard.conversationList.high", "High")}
          </DescribedSelectItem>
          <DescribedSelectItem
            value="urgent"
            title="Urgent"
            description={PRIORITY_DESCRIPTIONS.urgent}
          >
            {t("dashboard.conversationList.urgent", "Urgent")}
          </DescribedSelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
