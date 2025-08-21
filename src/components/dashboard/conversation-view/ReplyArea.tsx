import { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Send,
  Smile,
  Sparkles,
  Loader2
} from "lucide-react";
import { EmojiAutocompleteInput } from "@/components/ui/emoji-autocomplete-input";
import { useConversationView } from "@/contexts/ConversationViewContext";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const ReplyArea = () => {
  const { 
    state, 
    dispatch, 
    sendReply, 
    getAiSuggestions 
  } = useConversationView();
  const { t } = useTranslation();
  const replyRef = useRef<HTMLTextAreaElement>(null);

  // Focus the reply area when it becomes visible
  useEffect(() => {
    if (state.showReplyArea && replyRef.current) {
      replyRef.current.focus();
    }
  }, [state.showReplyArea]);

  const handleSendReply = async () => {
    if (!state.replyText.trim()) return;
    
    try {
      await sendReply(state.replyText, state.isInternalNote);
      dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: false });
    } catch (error) {
      // Error handling is done in the context
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSendReply();
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const textarea = replyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newText = state.replyText.slice(0, start) + emoji + state.replyText.slice(end);
      dispatch({ type: 'SET_REPLY_TEXT', payload: newText });
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    }
  };

  const handleAiSuggestionSelect = (suggestion: string) => {
    dispatch({ type: 'SET_REPLY_TEXT', payload: suggestion });
    dispatch({ type: 'SET_AI_STATE', payload: { open: false, loading: false, suggestions: [] } });
  };

  if (!state.showReplyArea) {
    return (
      <div className="p-4 border-t border-border bg-card">
        <Button 
          onClick={() => dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: true })}
          className="w-full"
        >
          {t('conversation.reply')}
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card">
      <div className="p-4">
        {/* AI Suggestions */}
        {state.aiSuggestions.length > 0 && (
          <div className="mb-4 space-y-2">
            <Label className="text-sm font-medium">{t('conversation.aiSuggestions')}</Label>
            <div className="space-y-2">
              {state.aiSuggestions.slice(0, 3).map((suggestion: any, index: number) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full text-left justify-start h-auto p-3"
                  onClick={() => handleAiSuggestionSelect(suggestion.text)}
                >
                  <div className="text-sm">{suggestion.text}</div>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="internal-note"
                checked={state.isInternalNote}
                onCheckedChange={(checked) => dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: checked })}
              />
              <Label htmlFor="internal-note" className="text-sm">
                {t('conversation.internalNote')}
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={getAiSuggestions}
                disabled={state.aiLoading}
              >
                {state.aiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                <span className="hidden sm:inline ml-2">
                  {t('conversation.aiSuggest')}
                </span>
              </Button>
            </div>
          </div>

          <div className="relative">
            <Textarea
              ref={replyRef}
              value={state.replyText}
              onChange={(e) => dispatch({ type: 'SET_REPLY_TEXT', payload: e.target.value })}
              onKeyDown={handleKeyPress}
              placeholder={
                state.isInternalNote 
                  ? t('conversation.internalNotePlaceholder')
                  : t('conversation.replyPlaceholder')
              }
              className={cn(
                "min-h-[100px] resize-none",
                state.isInternalNote && "border-orange-200 bg-orange-50/50"
              )}
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: false })}
            >
              {t('conversation.cancel')}
            </Button>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {t('conversation.ctrlEnterToSend')}
              </span>
              <Button 
                onClick={handleSendReply}
                disabled={!state.replyText.trim() || state.sendLoading}
                className={cn(
                  state.isInternalNote && "bg-orange-600 hover:bg-orange-700"
                )}
              >
                {state.sendLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {state.isInternalNote 
                  ? t('conversation.addNote')
                  : t('conversation.sendReply')
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};