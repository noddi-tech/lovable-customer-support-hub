import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { SUPPORTED_WIDGET_LANGUAGES, getWidgetTranslations } from '@/widget/translations';

interface WidgetTranslationEditorProps {
  greetingText: string;
  responseTimeText: string;
  dismissalMessageText: string;
  greetingTranslations: Record<string, string>;
  responseTimeTranslations: Record<string, string>;
  dismissalMessageTranslations: Record<string, string>;
  onUpdate: (updates: {
    greeting_text?: string;
    response_time_text?: string;
    dismissal_message_text?: string;
    greeting_translations?: Record<string, string>;
    response_time_translations?: Record<string, string>;
    dismissal_message_translations?: Record<string, string>;
  }) => void;
}

export const WidgetTranslationEditor: React.FC<WidgetTranslationEditorProps> = ({
  greetingText,
  responseTimeText,
  dismissalMessageText,
  greetingTranslations,
  responseTimeTranslations,
  dismissalMessageTranslations,
  onUpdate,
}) => {
  const [selectedLang, setSelectedLang] = useState<string>('no');

  const t = getWidgetTranslations(selectedLang);

  // Get the current value for the selected language
  const currentGreeting = greetingTranslations[selectedLang] || '';
  const currentResponseTime = responseTimeTranslations[selectedLang] || '';
  const currentDismissalMessage = dismissalMessageTranslations[selectedLang] || '';

  const handleGreetingChange = (value: string) => {
    const newTranslations = { ...greetingTranslations };
    if (value.trim() === '') {
      delete newTranslations[selectedLang];
    } else {
      newTranslations[selectedLang] = value;
    }
    onUpdate({ greeting_translations: newTranslations });
  };

  const handleResponseTimeChange = (value: string) => {
    const newTranslations = { ...responseTimeTranslations };
    if (value.trim() === '') {
      delete newTranslations[selectedLang];
    } else {
      newTranslations[selectedLang] = value;
    }
    onUpdate({ response_time_translations: newTranslations });
  };

  const handleDismissalMessageChange = (value: string) => {
    const newTranslations = { ...dismissalMessageTranslations };
    if (value.trim() === '') {
      delete newTranslations[selectedLang];
    } else {
      newTranslations[selectedLang] = value;
    }
    onUpdate({ dismissal_message_translations: newTranslations });
  };

  const clearGreeting = () => {
    const newTranslations = { ...greetingTranslations };
    delete newTranslations[selectedLang];
    onUpdate({ greeting_translations: newTranslations });
  };

  const clearResponseTime = () => {
    const newTranslations = { ...responseTimeTranslations };
    delete newTranslations[selectedLang];
    onUpdate({ response_time_translations: newTranslations });
  };

  const clearDismissalMessage = () => {
    const newTranslations = { ...dismissalMessageTranslations };
    delete newTranslations[selectedLang];
    onUpdate({ dismissal_message_translations: newTranslations });
  };

  const currentLang = SUPPORTED_WIDGET_LANGUAGES.find(l => l.code === selectedLang);

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">Per-Language Messages</h4>
      <p className="text-xs text-muted-foreground">
        Customize greeting, response time, and dismissal message for each language. Leave empty to use the default translation.
      </p>

      {/* Language Tabs */}
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {SUPPORTED_WIDGET_LANGUAGES.map((lang) => {
          const hasCustomGreeting = !!greetingTranslations[lang.code];
          const hasCustomResponseTime = !!responseTimeTranslations[lang.code];
          const hasCustomDismissal = !!dismissalMessageTranslations[lang.code];
          const hasCustomizations = hasCustomGreeting || hasCustomResponseTime || hasCustomDismissal;
          
          return (
            <button
              key={lang.code}
              onClick={() => setSelectedLang(lang.code)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                selectedLang === lang.code
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{lang.flag}</span>
              <span className="hidden sm:inline">{lang.name}</span>
              {hasCustomizations && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Has customizations" />
              )}
            </button>
          );
        })}
      </div>

      {/* Current language editor */}
      <div className="space-y-4 p-4 rounded-lg border bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-lg">{currentLang?.flag}</span>
          <span>{currentLang?.name}</span>
        </div>

        {/* Greeting Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Greeting Text</Label>
            {currentGreeting && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearGreeting}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <Textarea
            value={currentGreeting}
            onChange={(e) => handleGreetingChange(e.target.value)}
            placeholder={t.defaultGreeting}
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Default: {t.defaultGreeting}
          </p>
        </div>

        {/* Response Time Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Response Time Text</Label>
            {currentResponseTime && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearResponseTime}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <Input
            value={currentResponseTime}
            onChange={(e) => handleResponseTimeChange(e.target.value)}
            placeholder={t.defaultResponseTime}
          />
          <p className="text-xs text-muted-foreground">
            Default: {t.defaultResponseTime}
          </p>
        </div>

        {/* Dismissal Message Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Chat Dismissal Message</Label>
            {currentDismissalMessage && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearDismissalMessage}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          <Textarea
            value={currentDismissalMessage}
            onChange={(e) => handleDismissalMessageChange(e.target.value)}
            placeholder={t.chatDismissedMessage}
            rows={2}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Shown when agent cannot answer immediately. Default: {t.chatDismissedMessage}
          </p>
        </div>
      </div>

      {/* Summary of customizations */}
      {Object.keys(greetingTranslations).length > 0 || Object.keys(responseTimeTranslations).length > 0 || Object.keys(dismissalMessageTranslations).length > 0 ? (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Customized languages: </span>
          {Array.from(new Set([
            ...Object.keys(greetingTranslations),
            ...Object.keys(responseTimeTranslations),
            ...Object.keys(dismissalMessageTranslations)
          ])).map(code => {
            const lang = SUPPORTED_WIDGET_LANGUAGES.find(l => l.code === code);
            return lang ? `${lang.flag} ${lang.name}` : code;
          }).join(', ')}
        </div>
      ) : null}
    </div>
  );
};
