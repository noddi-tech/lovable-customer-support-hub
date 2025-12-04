import { useRef, useEffect, useState } from 'react';
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MentionTextarea } from "@/components/ui/mention-textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { 
  Send,
  Sparkles,
  Loader2,
  Languages,
  Lock,
  Database,
  Eye,
  Star
} from "lucide-react";
import { useConversationView } from "@/contexts/ConversationViewContext";
import { useTranslation } from "react-i18next";
import { useInteractionsNavigation } from "@/hooks/useInteractionsNavigation";
import { useIsMobile } from "@/hooks/use-responsive";
import { useMentionNotifications } from "@/hooks/useMentionNotifications";
import { cn } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TemplateSelector } from "./TemplateSelector";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { AiSuggestionDialog } from "./AiSuggestionDialog";
import { toast } from 'sonner';

export const ReplyArea = () => {
  const { 
    state, 
    dispatch, 
    sendReply, 
    getAiSuggestions,
    refineAiSuggestion,
    translateText,
    conversation,
    messages
  } = useConversationView();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { clearConversation } = useInteractionsNavigation();
  const { processMentions } = useMentionNotifications();
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [replyStatus, setReplyStatus] = React.useState<string>('pending');
  const [selectedSuggestionForDialog, setSelectedSuggestionForDialog] = useState<string | null>(null);
  const [originalSuggestionText, setOriginalSuggestionText] = useState<string>('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Available languages for translation
  const languages = [
    { code: 'auto', name: t('conversation.autoDetect') },
    { code: 'en', name: t('languages.en') },
    { code: 'es', name: t('languages.es') },
    { code: 'fr', name: t('languages.fr') },
    { code: 'de', name: t('languages.de') },
    { code: 'it', name: t('languages.it') },
    { code: 'pt', name: t('languages.pt') },
    { code: 'nl', name: t('languages.nl') },
    { code: 'no', name: t('languages.no') },
    { code: 'sv', name: t('languages.sv') },
    { code: 'da', name: t('languages.da') }
  ];

  // Focus the reply area when it becomes visible
  useEffect(() => {
    if (state.showReplyArea && replyRef.current) {
      replyRef.current.focus();
    }
  }, [state.showReplyArea]);

  const handleSendReply = async () => {
    if (!state.replyText.trim()) return;
    
    try {
      await sendReply(state.replyText, state.isInternalNote, replyStatus);
      
      // Process mentions for internal notes
      if (state.isInternalNote && mentionedUserIds.length > 0 && conversation?.id) {
        await processMentions(state.replyText, mentionedUserIds, {
          type: 'internal_note',
          conversation_id: conversation.id,
        });
      }
      
      // Clear reply text and collapse reply area
      dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
      dispatch({ type: 'SET_SHOW_REPLY_AREA', payload: false });
      dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: false });
      setMentionedUserIds([]);
      
      // Navigate back to inbox list
      clearConversation();
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

  const handleAiSuggestionSelect = (suggestion: string, index: number) => {
    setSelectedSuggestionForDialog(suggestion);
    setOriginalSuggestionText(suggestion);
  };

  const handleUseAsIs = () => {
    if (selectedSuggestionForDialog) {
      dispatch({ type: 'SET_REPLY_TEXT', payload: selectedSuggestionForDialog });
      dispatch({ type: 'SET_SELECTED_AI_SUGGESTION', payload: selectedSuggestionForDialog });
      setSelectedSuggestionForDialog(null);
      toast.success('Suggestion inserted into reply area');
    }
  };

  const handleRefineAndUse = async (refinementInstructions: string, originalText: string) => {
    const lastCustomerMessage = [...messages].reverse().find((m: any) => m.sender_type === 'customer');
    const customerMessageText = lastCustomerMessage?.content || '';
    
    const refinedText = await refineAiSuggestion(originalText, refinementInstructions, customerMessageText);
    
    if (refinedText) {
      dispatch({ type: 'SET_REPLY_TEXT', payload: refinedText });
      dispatch({ type: 'SET_SELECTED_AI_SUGGESTION', payload: refinedText });
      setSelectedSuggestionForDialog(refinedText); // Update dialog with refined version
      toast.success('Refined suggestion ready! You can refine it more or use it.');
    }
  };

  const handleTemplateSelect = (content: string, templateId: string) => {
    dispatch({ type: 'SET_REPLY_TEXT', payload: content });
    dispatch({ type: 'SET_SELECTED_TEMPLATE', payload: templateId });
  };

  const handleGetAiSuggestions = async () => {
    try {
      await getAiSuggestions();
    } catch (error) {
      // Error handling is done in the context
    }
  };

  const handleTranslate = async () => {
    if (!state.replyText.trim()) return;
    
    try {
      const translated = await translateText(state.replyText, state.sourceLanguage, state.targetLanguage);
      if (translated) {
        dispatch({ type: 'SET_REPLY_TEXT', payload: translated });
        dispatch({ type: 'SET_TRANSLATE_STATE', payload: { 
          open: false, 
          loading: false,
          sourceLanguage: state.sourceLanguage,
          targetLanguage: state.targetLanguage
        }});
      }
    } catch (error) {
      // Error handling is done in the context
    }
  };

  // Phase 3: Enhanced reply area with strong visual separation
  return (
    <div className="border-t-2 border-border bg-gray-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="p-6 space-y-4">
        {/* Feedback Prompt */}
        <FeedbackPrompt />

        {/* AI Suggestions Section with Preview Cards */}
        {state.aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {t('conversation.aiSuggestions')} ({state.aiSuggestions.length})
            </Label>
            <div className="grid gap-2">
              {state.aiSuggestions.map((suggestion, index) => {
                const preview = suggestion.length > 100 ? `${suggestion.slice(0, 100)}...` : suggestion;
                const charCount = suggestion.length;
                
                return (
                  <Card
                    key={index}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors border-border hover:border-primary/50"
                    onClick={() => handleAiSuggestionSelect(suggestion, index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-relaxed text-foreground/90 line-clamp-2">
                          {preview}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ~{charCount} characters
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Eye className="h-3 w-3" />
                          View
                        </Badge>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Suggestion Dialog */}
        <AiSuggestionDialog
          open={selectedSuggestionForDialog !== null}
          onOpenChange={(open) => !open && setSelectedSuggestionForDialog(null)}
          suggestion={selectedSuggestionForDialog || ''}
          onUseAsIs={handleUseAsIs}
          onRefine={handleRefineAndUse}
          isRefining={state.refiningSuggestion}
        />

        {/* Controls Row: Internal Note + AI + Translate */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Switch
              id="internal-note"
              checked={state.isInternalNote}
              onCheckedChange={(checked) => 
                dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: checked })
              }
              className="data-[state=checked]:bg-amber-500"
            />
            <Label 
              htmlFor="internal-note" 
              className="text-sm cursor-pointer font-semibold"
            >
              {t('conversation.internalNote')}
            </Label>
            {state.isInternalNote && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <Lock className="h-3 w-3 mr-1" />
                Only visible to team
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Template Selector */}
            <TemplateSelector 
              onSelectTemplate={handleTemplateSelect}
              isMobile={isMobile}
            />

            {/* AI Suggestions Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGetAiSuggestions}
              disabled={state.aiLoading}
              className="gap-2"
              title={t('conversation.getAiSuggestions')}
            >
              {state.aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {!isMobile && <span className="text-xs">AI Suggest</span>}
            </Button>

            {/* Translation Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!state.replyText.trim()}
                  className="gap-2"
                  title={t('conversation.translate')}
                >
                  <Languages className="h-4 w-4" />
                  {!isMobile && <span className="text-xs">Translate</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 bg-popover border border-border shadow-md z-50" align="end">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">{t('conversation.translate')}</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">{t('conversation.from')}</Label>
                    <Select
                      value={state.sourceLanguage}
                      onValueChange={(value) => 
                        dispatch({ type: 'SET_TRANSLATE_STATE', payload: { 
                          open: state.translateOpen,
                          loading: state.translateLoading,
                          sourceLanguage: value,
                          targetLanguage: state.targetLanguage
                        }})
                      }
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border shadow-md z-50">
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">{t('conversation.to')}</Label>
                    <Select
                      value={state.targetLanguage}
                      onValueChange={(value) => 
                        dispatch({ type: 'SET_TRANSLATE_STATE', payload: { 
                          open: state.translateOpen,
                          loading: state.translateLoading,
                          sourceLanguage: state.sourceLanguage,
                          targetLanguage: value
                        }})
                      }
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border shadow-md z-50">
                        {languages.filter(l => l.code !== 'auto').map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleTranslate}
                    disabled={state.translateLoading || !state.replyText.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {state.translateLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t('conversation.translate')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Text Input Area */}
        <div className="space-y-2">
          {state.trackingActive && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/20 rounded-md">
              <Database className="h-3 w-3 text-primary animate-pulse" />
              <span className="text-xs text-primary font-medium">
                Learning from this response...
              </span>
            </div>
          )}
          {state.isInternalNote ? (
            <MentionTextarea
              value={state.replyText}
              onChange={(value, mentions) => {
                dispatch({ type: 'SET_REPLY_TEXT', payload: value });
                setMentionedUserIds(mentions);
              }}
              mentionedUserIds={mentionedUserIds}
              onKeyDown={handleKeyPress}
              placeholder={t('conversation.internalNotePlaceholder') + ' (Type @ to mention team members)'}
              className={cn(
                "min-h-[140px] resize-none transition-colors text-sm",
                "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
              )}
            />
          ) : (
            <Textarea
              ref={replyRef}
              value={state.replyText}
              onChange={(e) => dispatch({ type: 'SET_REPLY_TEXT', payload: e.target.value })}
              onKeyDown={handleKeyPress}
              placeholder={t('conversation.replyPlaceholder')}
              className="min-h-[140px] resize-none transition-colors text-sm"
            />
          )}
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted rounded border text-xs font-medium">Ctrl+Enter</kbd> to send
            {state.isInternalNote && <span className="ml-2">• Type <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs">@</kbd> to mention team members</span>}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => {
              dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
              dispatch({ type: 'SET_IS_INTERNAL_NOTE', payload: false });
            }}
            disabled={state.sendLoading}
          >
            {t('conversation.cancel')}
          </Button>

          <div className="flex items-center gap-2">
            {!state.isInternalNote && (
              <Select value={replyStatus} onValueChange={setReplyStatus}>
                <SelectTrigger className="w-[160px] h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Send & Mark Pending</SelectItem>
                  <SelectItem value="closed">Send & Close</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <Button
              onClick={handleSendReply}
              disabled={!state.replyText.trim() || state.sendLoading}
              size="lg"
              className="gap-2 px-6"
            >
              {state.sendLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('conversation.sending')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {state.isInternalNote ? t('conversation.addNote') : t('conversation.send')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
