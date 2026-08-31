import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ConversationCaseSection } from '@/components/cases/ConversationCaseSection';
import { CustomerTimeline } from '@/components/cases/CustomerTimeline';

interface ChatCaseSidePanelProps {
  conversationId: string;
  className?: string;
}

/**
 * Case + unified customer history for the live chat view, so a chat is not a
 * dead end: agents can create/link a case and see every past interaction.
 */
export const ChatCaseSidePanel: React.FC<ChatCaseSidePanelProps> = ({
  conversationId,
  className,
}) => {
  const { data: conversation } = useQuery({
    queryKey: ['chat-case-panel', conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from('conversations') as any)
        .select('id, subject, channel, customer_id, case_id, inbox_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        subject: string | null;
        channel: string | null;
        customer_id: string | null;
        case_id: string | null;
        inbox_id: string | null;
      } | null;
    },
  });

  if (!conversation) return null;

  return (
    <div className={className}>
      <div className="space-y-3 p-3">
        <ConversationCaseSection
          conversationId={conversation.id}
          caseId={conversation.case_id}
          customerId={conversation.customer_id}
          subject={conversation.subject}
          inboxId={conversation.inbox_id}
          channel={conversation.channel}
        />
        <CustomerTimeline
          customerId={conversation.customer_id}
          currentConversationId={conversation.id}
        />
      </div>
    </div>
  );
};
