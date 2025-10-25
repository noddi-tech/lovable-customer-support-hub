import { useConversationView } from "@/contexts/ConversationViewContext";
import { FeedbackRating } from "./FeedbackRating";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FeedbackPrompt() {
  const { state, dispatch } = useConversationView();

  if (!state.showFeedbackRating || !state.lastSentMessageId) {
    return null;
  }

  const handleDismiss = () => {
    dispatch({ type: 'SET_FEEDBACK_STATE', payload: { show: false, messageId: null } });
  };

  const handleSubmit = () => {
    dispatch({ type: 'SET_FEEDBACK_STATE', payload: { show: false, messageId: null } });
  };

  return (
    <div className="relative mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0"
        onClick={handleDismiss}
      >
        <X className="w-4 h-4" />
      </Button>
      <FeedbackRating
        messageId={state.lastSentMessageId}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
