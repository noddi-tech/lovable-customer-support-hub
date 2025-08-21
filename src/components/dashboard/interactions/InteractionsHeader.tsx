import React from 'react';
import { Search, Filter, Plus, MoreVertical, Archive, Settings } from 'lucide-react';
import { StandardActionToolbar } from '@/components/layout/StandardActionToolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useInteractions } from '@/contexts/InteractionsContext';
import { useTranslation } from 'react-i18next';

export const InteractionsHeader = () => {
  const { state, setSearchQuery, resetFilters } = useInteractions();
  const { t } = useTranslation();

  const actionGroups = [
    {
      id: 'primary',
      actions: [
        {
          id: 'new-conversation',
          icon: Plus,
          label: t('interactions.newConversation', 'New Conversation'),
          onClick: () => console.log('New conversation'),
          variant: 'default' as const
        },
        {
          id: 'search',
          icon: Search,
          label: t('common.search', 'Search'),
          onClick: () => console.log('Search'),
          variant: 'outline' as const
        }
      ]
    },
    {
      id: 'secondary',
      actions: [
        {
          id: 'filter',
          icon: Filter,
          label: t('common.filter', 'Filter'),
          onClick: () => console.log('Filter'),
          variant: 'ghost' as const
        },
        {
          id: 'archive',
          icon: Archive,
          label: t('common.archive', 'Archive'),
          onClick: () => console.log('Archive'),
          variant: 'ghost' as const
        },
        {
          id: 'settings',
          icon: Settings,
          label: t('common.settings', 'Settings'),
          onClick: () => console.log('Settings'),
          variant: 'ghost' as const
        },
        {
          id: 'more',
          icon: MoreVertical,
          label: t('common.more', 'More'),
          onClick: () => console.log('More options'),
          variant: 'ghost' as const
        }
      ]
    }
  ];

  const breadcrumbs = [
    { label: t('nav.interactions', 'Interactions'), href: '/interactions' },
    { label: state.selectedSection === 'inbox' ? t('nav.inbox', 'Inbox') : state.selectedSection }
  ];

  const rightContent = (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t('interactions.searchPlaceholder', 'Search conversations...')}
          value={state.searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 w-64"
        />
      </div>
      
      {/* Active filters indicator */}
      {(state.filters.status.length > 0 || 
        state.filters.priority.length > 0 || 
        state.filters.channel.length > 0 ||
        state.searchQuery) && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {state.filters.status.length + state.filters.priority.length + state.filters.channel.length + (state.searchQuery ? 1 : 0)}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs"
          >
            {t('common.clear', 'Clear')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <StandardActionToolbar
      title={t('nav.interactions', 'Interactions')}
      breadcrumbs={breadcrumbs}
      actionGroups={actionGroups}
      rightContent={rightContent}
      className="border-b border-border bg-background/95 backdrop-blur-sm"
    />
  );
};