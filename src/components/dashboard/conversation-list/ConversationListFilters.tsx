import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useConversationList } from "@/contexts/ConversationListContext";
import { useTranslation } from "react-i18next";

export const ConversationListFilters = () => {
  const { state, dispatch } = useConversationList();
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      <Select 
        value={state.statusFilter} 
        onValueChange={(value) => dispatch({ type: 'SET_STATUS_FILTER', payload: value })}
      >
      <SelectTrigger className="w-32 h-9 text-xs md:text-sm">
        <SelectValue placeholder={t('dashboard.conversationList.allStatus', 'All Status')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('dashboard.conversationList.allStatus', 'All Status')}</SelectItem>
        <SelectItem value="open">{t('dashboard.conversationList.open', 'Open')}</SelectItem>
        <SelectItem value="pending">{t('dashboard.conversationList.pending', 'Pending')}</SelectItem>
        <SelectItem value="closed">{t('dashboard.conversationList.closed', 'Closed')}</SelectItem>
      </SelectContent>
      </Select>
      
      <Select 
        value={state.priorityFilter} 
        onValueChange={(value) => dispatch({ type: 'SET_PRIORITY_FILTER', payload: value })}
      >
        <SelectTrigger className="w-32 h-9 text-xs md:text-sm">
          <SelectValue placeholder={t('dashboard.conversationList.allPriority', 'All Priority')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('dashboard.conversationList.allPriority', 'All Priority')}</SelectItem>
          <SelectItem value="low">{t('dashboard.conversationList.low', 'Low')}</SelectItem>
          <SelectItem value="normal">{t('dashboard.conversationList.normal', 'Normal')}</SelectItem>
          <SelectItem value="high">{t('dashboard.conversationList.high', 'High')}</SelectItem>
          <SelectItem value="urgent">{t('dashboard.conversationList.urgent', 'Urgent')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};