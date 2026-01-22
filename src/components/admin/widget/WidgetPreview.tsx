import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Search, ArrowLeft, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getWidgetTranslations } from '@/widget/translations';

interface WidgetPreviewProps {
  config: {
    primary_color: string;
    position: string;
    greeting_text: string;
    response_time_text: string;
    enable_chat: boolean;
    enable_contact_form: boolean;
    enable_knowledge_search: boolean;
    logo_url: string | null;
    company_name: string | null;
    language?: string;
  };
}

export const WidgetPreview: React.FC<WidgetPreviewProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'chat' | 'ask' | 'search'>('home');
  const [showTypingDemo, setShowTypingDemo] = useState(false);
  const [showAgentResponse, setShowAgentResponse] = useState(false);

  const t = getWidgetTranslations(config.language || 'no');

  // Reset typing demo when switching views
  useEffect(() => {
    if (activeView === 'chat') {
      setShowTypingDemo(false);
      setShowAgentResponse(false);
      
      // Start typing demo after a short delay
      const typingTimer = setTimeout(() => {
        setShowTypingDemo(true);
      }, 1500);
      
      // Show agent response after typing
      const responseTimer = setTimeout(() => {
        setShowTypingDemo(false);
        setShowAgentResponse(true);
      }, 4000);
      
      return () => {
        clearTimeout(typingTimer);
        clearTimeout(responseTimer);
      };
    }
  }, [activeView]);

  return (
    <div className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl p-8 min-h-[550px] flex items-center justify-center">
      {/* Widget */}
      <div className="relative">
        {isOpen ? (
          <div 
            className="bg-background border shadow-2xl rounded-xl w-[340px] overflow-hidden"
            style={{ 
              boxShadow: `0 25px 60px -15px ${config.primary_color}50`
            }}
          >
            {/* Header */}
            <div 
              className="p-4 text-white"
              style={{ backgroundColor: config.primary_color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {activeView !== 'home' && (
                    <button 
                      onClick={() => setActiveView('home')}
                      className="hover:opacity-80"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  )}
                  {config.logo_url ? (
                    <img 
                      src={config.logo_url} 
                      alt="" 
                      className="h-8 w-8 rounded-full bg-white/20"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                  )}
                  <span className="font-medium">
                    {config.company_name || 'Support'}
                  </span>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="hover:opacity-80"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {activeView === 'home' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{config.greeting_text}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.response_time_text}
                    </p>
                  </div>

                  <div className="space-y-2">
                    {config.enable_chat && (
                      <button
                        onClick={() => setActiveView('chat')}
                        className="w-full p-3 rounded-lg border hover:bg-muted/50 text-left flex items-center gap-3 transition-colors"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${config.primary_color}20` }}
                        >
                          <Sparkles className="h-5 w-5" style={{ color: config.primary_color }} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{t.startLiveChat}</div>
                          <div className="text-xs text-muted-foreground">{t.talkToUsRealtime}</div>
                        </div>
                      </button>
                    )}

                    {config.enable_contact_form && (
                      <button
                        onClick={() => setActiveView('ask')}
                        className="w-full p-3 rounded-lg border hover:bg-muted/50 text-left flex items-center gap-3 transition-colors"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${config.primary_color}20` }}
                        >
                          <Mail className="h-5 w-5" style={{ color: config.primary_color }} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{t.sendMessage}</div>
                          <div className="text-xs text-muted-foreground">{t.wellReplyViaEmail}</div>
                        </div>
                      </button>
                    )}

                    {config.enable_knowledge_search && (
                      <button
                        onClick={() => setActiveView('search')}
                        className="w-full p-3 rounded-lg border hover:bg-muted/50 text-left flex items-center gap-3 transition-colors"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${config.primary_color}20` }}
                        >
                          <Search className="h-5 w-5" style={{ color: config.primary_color }} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{t.searchAnswers}</div>
                          <div className="text-xs text-muted-foreground">{t.findAnswersInstantly}</div>
                        </div>
                      </button>
                    )}

                    {!config.enable_chat && !config.enable_contact_form && !config.enable_knowledge_search && (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        Enable at least one feature to show options here
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeView === 'chat' && (
                <div className="space-y-4">
                  {/* Demo conversation with typing indicator */}
                  <div className="space-y-3 min-h-[180px]">
                    {/* Visitor message (demo) */}
                    <div className="flex justify-end">
                      <div 
                        className="px-4 py-2 rounded-2xl rounded-br-sm text-white max-w-[80%]"
                        style={{ backgroundColor: config.primary_color }}
                      >
                        Hi, I need help with my order
                      </div>
                    </div>
                    
                    {/* Agent typing indicator */}
                    {showTypingDemo && (
                      <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-muted">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                            <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Agent response */}
                    {showAgentResponse && (
                      <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="px-4 py-2 rounded-2xl rounded-bl-sm bg-muted max-w-[80%]">
                          <span className="text-xs text-muted-foreground block mb-1">Support Team</span>
                          Hi there! I'd be happy to help with your order. Can you share your order number?
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input placeholder={t.typeMessage} className="flex-1" />
                    <Button size="icon" style={{ backgroundColor: config.primary_color }}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Preview label */}
                  <p className="text-xs text-center text-muted-foreground">
                    This preview shows typing indicators and message flow
                  </p>
                </div>
              )}

              {activeView === 'ask' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Input placeholder={t.yourName} />
                    <Input placeholder={t.email} type="email" />
                    <Textarea placeholder={t.howCanWeHelp} rows={4} />
                  </div>
                  <Button 
                    className="w-full gap-2"
                    style={{ backgroundColor: config.primary_color }}
                  >
                    <Send className="h-4 w-4" />
                    {t.sendMessageBtn}
                  </Button>
                </div>
              )}

              {activeView === 'search' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder={t.searchPlaceholder} 
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground text-center py-6">
                    {t.searchKnowledgeBase}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t text-center">
              <span className="text-xs text-muted-foreground">
                {t.poweredBy}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white transition-transform hover:scale-110"
            style={{ 
              backgroundColor: config.primary_color,
              boxShadow: `0 4px 20px -4px ${config.primary_color}80`
            }}
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        )}
      </div>
    </div>
  );
};
