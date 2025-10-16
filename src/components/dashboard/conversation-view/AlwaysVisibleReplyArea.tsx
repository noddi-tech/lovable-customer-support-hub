import { ReplyArea } from './ReplyArea';
import { useConversationView } from "@/contexts/ConversationViewContext";
import { useEffect } from 'react';

interface AlwaysVisibleReplyAreaProps {
  conversationId: string;
  onReply?: (content: string, isInternal: boolean) => Promise<void>;
}

export const AlwaysVisibleReplyArea = ({ conversationId, onReply }: AlwaysVisibleReplyAreaProps) => {
  const { dispatch } = useConversationView();

  // Ensure reply area is always visible
  useEffect(() => {
    dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: true });
  }, [dispatch]);

  return <ReplyArea />;
};
