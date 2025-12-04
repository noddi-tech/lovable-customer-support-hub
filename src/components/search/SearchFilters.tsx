import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import type { SearchFilters as SearchFiltersType } from '@/hooks/useGlobalSearch';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  onFiltersChange: (filters: SearchFiltersType) => void;
}

export const SearchFilters = ({ filters, onFiltersChange }: SearchFiltersProps) => {
  const { t } = useTranslation();
  
  // Fetch inboxes
  const { data: inboxes = [] } = useQuery({
    queryKey: ['inboxes-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inboxes');
      if (error) throw error;
      return data || [];
    },
  });
  
  // Fetch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });
  
  const updateFilter = (key: keyof SearchFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value === 'all' ? undefined : value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-4">{t('search.filterResults', 'Filter Results')}</h3>
      </div>
      
      {/* Status Filter */}
      <div className="space-y-2">
        <Label className="text-sm">{t('search.status', 'Status')}</Label>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => updateFilter('status', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('search.allStatuses', 'All statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('search.allStatuses', 'All statuses')}</SelectItem>
            <SelectItem value="open">{t('search.open', 'Open')}</SelectItem>
            <SelectItem value="pending">{t('search.pending', 'Pending')}</SelectItem>
            <SelectItem value="closed">{t('search.closed', 'Closed')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Inbox Filter */}
      <div className="space-y-2">
        <Label className="text-sm">{t('search.inbox', 'Inbox')}</Label>
        <Select
          value={filters.inboxId || 'all'}
          onValueChange={(v) => updateFilter('inboxId', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('search.allInboxes', 'All inboxes')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('search.allInboxes', 'All inboxes')}</SelectItem>
            {inboxes.map((inbox: any) => (
              <SelectItem key={inbox.id} value={inbox.id}>
                {inbox.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Assigned To Filter */}
      <div className="space-y-2">
        <Label className="text-sm">{t('search.assignedTo', 'Assigned to')}</Label>
        <Select
          value={filters.assignedToId || 'all'}
          onValueChange={(v) => updateFilter('assignedToId', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('search.anyone', 'Anyone')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('search.anyone', 'Anyone')}</SelectItem>
            <SelectItem value="unassigned">{t('search.unassigned', 'Unassigned')}</SelectItem>
            {agents.map((agent: any) => (
              <SelectItem key={agent.user_id} value={agent.user_id}>
                {agent.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Date Filters */}
      <div className="space-y-2">
        <Label className="text-sm">{t('search.dateRange', 'Date range')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">{t('search.from', 'From')}</Label>
            <Input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="h-8"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('search.to', 'To')}</Label>
            <Input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      </div>
      
      {/* Has Attachments */}
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t('search.hasAttachments', 'Has attachments')}</Label>
        <Switch
          checked={filters.hasAttachments || false}
          onCheckedChange={(v) => updateFilter('hasAttachments', v || undefined)}
        />
      </div>
      
      {/* Is Unread */}
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t('search.unreadOnly', 'Unread only')}</Label>
        <Switch
          checked={filters.isUnread || false}
          onCheckedChange={(v) => updateFilter('isUnread', v || undefined)}
        />
      </div>
    </div>
  );
};
