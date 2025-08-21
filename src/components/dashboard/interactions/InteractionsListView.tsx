import React, { useMemo } from 'react';
import { StandardListView } from '@/components/layout/StandardListView';
import { ConversationListItem } from '../conversation-list/ConversationListItem';
import { useInteractions, type Conversation } from '@/contexts/InteractionsContext';
import { useConversationList } from '@/contexts/ConversationListContext';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const InteractionsListView = () => {
  const { state, selectConversation, setViewMode, setSearchQuery } = useInteractions();
  const { conversations, isLoading } = useConversationList();
  const { t } = useTranslation();

  // Filter conversations based on current section and filters
  const filteredConversations = useMemo(() => {
    if (!conversations) return [];

    return conversations.filter((conversation: Conversation) => {
      // Filter by section
      switch (state.selectedSection) {
        case 'inbox':
          return !conversation.is_archived;
        case 'assigned':
          return conversation.assigned_to && !conversation.is_archived;
        case 'unassigned':
          return !conversation.assigned_to && !conversation.is_archived;
        case 'urgent':
          return conversation.priority === 'urgent' && !conversation.is_archived;
        case 'archived':
          return conversation.is_archived;
        case 'sent':
          return conversation.status === 'resolved';
        case 'deleted':
          return false; // Implement soft delete logic
        default:
          // Channel filters
          if (['email', 'chat', 'social', 'facebook', 'instagram', 'whatsapp'].includes(state.selectedSection)) {
            return conversation.channel === state.selectedSection;
          }
          return true;
      }
    }).filter((conversation: Conversation) => {
      // Apply status filters
      if (state.filters.status.length > 0 && !state.filters.status.includes(conversation.status)) {
        return false;
      }

      // Apply priority filters
      if (state.filters.priority.length > 0 && !state.filters.priority.includes(conversation.priority)) {
        return false;
      }

      // Apply channel filters
      if (state.filters.channel.length > 0 && !state.filters.channel.includes(conversation.channel)) {
        return false;
      }

      // Apply search query
      if (state.searchQuery) {
        const searchLower = state.searchQuery.toLowerCase();
        return (
          conversation.subject.toLowerCase().includes(searchLower) ||
          conversation.customer?.full_name.toLowerCase().includes(searchLower) ||
          conversation.customer?.email.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [conversations, state.selectedSection, state.filters, state.searchQuery]);

  const handleConversationClick = (conversation: Conversation) => {
    selectConversation(conversation.id);
  };

  const renderConversationItem = (conversation: Conversation) => (
    <ConversationListItem
      key={conversation.id}
      conversation={conversation}
      isSelected={state.selectedConversationId === conversation.id}
      onSelect={() => handleConversationClick(conversation)}
    />
  );

  const filterOptions = [
    {
      id: 'status',
      label: t('interactions.status', 'Status'),
      value: 'status'
    },
    {
      id: 'priority',
      label: t('interactions.priority', 'Priority'),
      value: 'priority'
    },
    {
      id: 'channel',
      label: t('interactions.channel', 'Channel'),
      value: 'channel'
    }
  ];

  const sortOptions = [
    { id: 'updated_at', value: 'updated_at', label: t('sort.lastUpdated', 'Last Updated') },
    { id: 'received_at', value: 'received_at', label: t('sort.received', 'Received') },
    { id: 'priority', value: 'priority', label: t('sort.priority', 'Priority') },
    { id: 'status', value: 'status', label: t('sort.status', 'Status') }
  ];

  const getSectionTitle = () => {
    switch (state.selectedSection) {
      case 'inbox': return t('interactions.allConversations', 'All Conversations');
      case 'assigned': return t('interactions.assignedToMe', 'Assigned to Me');
      case 'unassigned': return t('interactions.unassigned', 'Unassigned');
      case 'urgent': return t('interactions.urgent', 'Urgent');
      case 'archived': return t('interactions.archived', 'Archived');
      case 'sent': return t('interactions.sent', 'Sent');
      case 'deleted': return t('interactions.deleted', 'Deleted');
      case 'email': return t('interactions.email', 'Email');
      case 'chat': return t('interactions.chat', 'Chat');
      case 'social': return t('interactions.social', 'Social');
      case 'facebook': return t('interactions.facebook', 'Facebook');
      case 'instagram': return t('interactions.instagram', 'Instagram');
      case 'whatsapp': return t('interactions.whatsapp', 'WhatsApp');
      default: return t('interactions.conversations', 'Conversations');
    }
  };

  return (
    <StandardListView
      title={getSectionTitle()}
      items={filteredConversations}
      renderItem={renderConversationItem}
      isLoading={isLoading}
      filters={filterOptions}
      sortOptions={sortOptions}
      viewMode={state.viewMode}
      onViewModeChange={setViewMode}
      searchValue={state.searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder={t('interactions.searchPlaceholder', 'Search conversations...')}
      emptyState={{
        icon: MessageCircle,
        title: t('interactions.noConversations', 'No conversations found'),
        description: t('interactions.noConversationsDesc', 'There are no conversations matching your current filters.'),
        action: {
          label: t('interactions.newConversation', 'New Conversation'),
          onClick: () => console.log('Create new conversation')
        }
      }}
      className="h-full"
    />
  );
};