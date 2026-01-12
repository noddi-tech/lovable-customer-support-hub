import React, { useState } from 'react';
import { MessageCircle, X, Send, Search, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WidgetPreviewProps {
  config: {
    primary_color: string;
    position: string;
    greeting_text: string;
    response_time_text: string;
    enable_contact_form: boolean;
    enable_knowledge_search: boolean;
    logo_url: string | null;
    company_name: string | null;
  };
}

export const WidgetPreview: React.FC<WidgetPreviewProps> = ({ config }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeView, setActiveView] = useState<'home' | 'ask' | 'search'>('home');

  const positionClass = config.position === 'bottom-left' ? 'left-4' : 'right-4';

  return (
    <div className="relative bg-gradient-to-br from-muted/30 to-muted/50 rounded-lg p-6 min-h-[500px] overflow-hidden">
      <p className="text-xs text-muted-foreground text-center mb-4">
        Widget Preview - This is how it will appear on your website
      </p>

      {/* Mock website content */}
      <div className="bg-background border rounded-lg p-4 min-h-[400px] relative">
        <div className="space-y-2 opacity-50">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-5/6" />
          <div className="h-4 bg-muted rounded w-4/6" />
        </div>

        {/* Widget */}
        <div className={`absolute bottom-4 ${positionClass}`}>
          {isOpen ? (
            <div 
              className="bg-background border shadow-lg rounded-xl w-[320px] overflow-hidden"
              style={{ 
                boxShadow: `0 10px 40px -10px ${config.primary_color}40`
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
                            <div className="font-medium text-sm">Send us a message</div>
                            <div className="text-xs text-muted-foreground">We'll reply via email</div>
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
                            <div className="font-medium text-sm">Search our help center</div>
                            <div className="text-xs text-muted-foreground">Find answers instantly</div>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {activeView === 'ask' && (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Input placeholder="Your name" />
                      <Input placeholder="Your email" type="email" />
                      <Textarea placeholder="How can we help?" rows={4} />
                    </div>
                    <Button 
                      className="w-full gap-2"
                      style={{ backgroundColor: config.primary_color }}
                    >
                      <Send className="h-4 w-4" />
                      Send Message
                    </Button>
                  </div>
                )}

                {activeView === 'search' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search for answers..." 
                        className="pl-10"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground text-center py-6">
                      Type to search our knowledge base
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t text-center">
                <span className="text-xs text-muted-foreground">
                  Powered by Noddi
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
    </div>
  );
};
