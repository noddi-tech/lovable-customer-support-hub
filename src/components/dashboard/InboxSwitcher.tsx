import React from 'react';
import { ChevronDown, Inbox, Palette } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useOptimizedCounts } from '@/hooks/useOptimizedCounts';
import { useTranslation } from 'react-i18next';

interface InboxSwitcherProps {
  selectedInboxId: string;
  onInboxChange: (inboxId: string) => void;
  showAllOption?: boolean;
  className?: string;
}

export const InboxSwitcher: React.FC<InboxSwitcherProps> = ({
  selectedInboxId,
  onInboxChange,
  showAllOption = true,
  className = ""
}) => {
  const { inboxes, conversations } = useOptimizedCounts();
  const { t } = useTranslation();

  const handleValueChange = (value: string) => {
    onInboxChange(value);
  };

  const getInboxDisplayName = (inboxId: string) => {
    if (inboxId === 'all') return t('dashboard.allInboxes', 'All Inboxes');
    const inbox = inboxes.find(i => i.id === inboxId);
    return inbox?.name || t('dashboard.unknownInbox', 'Unknown Inbox');
  };

  const getInboxColor = (inboxId: string) => {
    if (inboxId === 'all') return '#6B7280';
    const inbox = inboxes.find(i => i.id === inboxId);
    return inbox?.color || '#6B7280';
  };

  const getInboxCount = (inboxId: string) => {
    if (inboxId === 'all') return conversations.all;
    const inbox = inboxes.find(i => i.id === inboxId);
    return inbox?.conversation_count || 0;
  };

  return (
    <Select value={selectedInboxId} onValueChange={handleValueChange}>
      <SelectTrigger className={`w-auto min-w-[180px] ${className}`}>
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getInboxColor(selectedInboxId) }}
          />
          <SelectValue>
            {getInboxDisplayName(selectedInboxId)}
          </SelectValue>
          <Badge variant="secondary" className="text-xs">
            {getInboxCount(selectedInboxId)}
          </Badge>
        </div>
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4 text-muted-foreground" />
              <span>{t('dashboard.allInboxes', 'All Inboxes')}</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {conversations.all}
              </Badge>
            </div>
          </SelectItem>
        )}
        {inboxes
          .filter(inbox => inbox.is_active)
          .map((inbox) => (
            <SelectItem key={inbox.id} value={inbox.id}>
              <div className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: inbox.color }}
                />
                <span>{inbox.name}</span>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {inbox.conversation_count}
                </Badge>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
};