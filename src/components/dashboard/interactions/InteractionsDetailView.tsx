import React from 'react';
import { ConversationView } from '../ConversationView';
import { StandardDetailView } from '@/components/layout/StandardDetailView';
import { useInteractions } from '@/contexts/InteractionsContext';
import { useTranslation } from 'react-i18next';
import { 
  MessageCircle, 
  Archive, 
  Trash2, 
  UserPlus, 
  Flag,
  MoreHorizontal,
  Reply,
  Forward,
  Tag
} from 'lucide-react';

interface InteractionsDetailViewProps {
  conversationId: string;
}

export const InteractionsDetailView: React.FC<InteractionsDetailViewProps> = ({
  conversationId
}) => {
  const { selectConversation } = useInteractions();
  const { t } = useTranslation();

  const handleBack = () => {
    selectConversation(null);
  };

  const detailActions = [
    {
      id: 'reply',
      label: t('actions.reply', 'Reply'),
      icon: Reply,
      onClick: () => console.log('Reply to conversation')
    },
    {
      id: 'forward',
      label: t('actions.forward', 'Forward'),
      icon: Forward,
      onClick: () => console.log('Forward conversation')
    },
    {
      id: 'assign',
      label: t('actions.assign', 'Assign'),
      icon: UserPlus,
      onClick: () => console.log('Assign conversation')
    },
    {
      id: 'tag',
      label: t('actions.tag', 'Tag'),
      icon: Tag,
      onClick: () => console.log('Tag conversation')
    },
    {
      id: 'priority',
      label: t('actions.priority', 'Priority'),
      icon: Flag,
      onClick: () => console.log('Change priority')
    },
    {
      id: 'archive',
      label: t('actions.archive', 'Archive'),
      icon: Archive,
      onClick: () => console.log('Archive conversation')
    },
    {
      id: 'delete',
      label: t('actions.delete', 'Delete'),
      icon: Trash2,
      onClick: () => console.log('Delete conversation')
    },
    {
      id: 'more',
      label: t('actions.more', 'More'),
      icon: MoreHorizontal,
      onClick: () => console.log('More actions')
    }
  ];

  const sections = [
    {
      id: 'conversation',
      title: t('sections.conversation', 'Conversation'),
      content: <ConversationView conversationId={conversationId} />,
      collapsible: false
    }
  ];

  return (
    <StandardDetailView
      title={t('interactions.conversationDetails', 'Conversation Details')}
      showBackButton
      onBack={handleBack}
      actions={detailActions}
      sections={sections}
      className="h-full"
    />
  );
};