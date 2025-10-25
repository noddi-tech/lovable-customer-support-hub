import { useRef, useEffect } from 'react';
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Send,
  Sparkles,
  Loader2,
  Languages,
  Lock,
  Database
} from "lucide-react";
import { useConversationView } from "@/contexts/ConversationViewContext";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-responsive";
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

export const ReplyArea = () => {
  const { 
    state, 
    dispatch, 
    sendReply, 
    getAiSuggestions,
    translateText
  } = useConversationView();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const [replyStatus, setReplyStatus] = React.useState<string>('pending');

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
      dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
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
    dispatch({ type: 'SET_REPLY_TEXT', payload: suggestion });
    dispatch({ type: 'SET_SELECTED_AI_SUGGESTION', payload: `suggestion_${index}` });
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

        {/* AI Suggestions Section */}
        {state.aiSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">{t('conversation.aiSuggestions')}</Label>
            <div className="flex flex-wrap gap-2">
              {state.aiSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleAiSuggestionSelect(suggestion, index)}
                  className="text-xs h-auto py-1.5 whitespace-normal text-left"
                >
                  {suggestion.length > 60 ? `${suggestion.slice(0, 60)}...` : suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

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
          <Textarea
            ref={replyRef}
            value={state.replyText}
            onChange={(e) => dispatch({ type: 'SET_REPLY_TEXT', payload: e.target.value })}
            onKeyDown={handleKeyPress}
            placeholder={state.isInternalNote 
              ? t('conversation.writeInternalNote')
              : t('conversation.typeYourReply')
            }
            className={cn(
              "min-h-[140px] resize-none transition-colors text-sm",
              state.isInternalNote && "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900"
            )}
          />
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-2 py-1 bg-muted rounded border text-xs font-medium">Ctrl+Enter</kbd> to send
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
