import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  StopCircle, 
  MessageCircle, 
  Send, 
  Info,
  ArrowLeft,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface WidgetConfig {
  id: string;
  widget_key: string;
  primary_color: string;
  position: string;
  greeting_text: string;
  response_time_text: string;
  enable_chat: boolean;
  enable_contact_form: boolean;
  enable_knowledge_search: boolean;
  logo_url: string | null;
  company_name: string | null;
}

interface WidgetTestModeProps {
  config: WidgetConfig;
}

interface TestMessage {
  id: string;
  content: string;
  sender: 'visitor' | 'agent';
  timestamp: Date;
}

interface TestLogEntry {
  id: string;
  event: string;
  timestamp: Date;
  details?: string;
}

export const WidgetTestMode: React.FC<WidgetTestModeProps> = ({ config }) => {
  const [isTestActive, setIsTestActive] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'chat'>('home');
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [testLog, setTestLog] = useState<TestLogEntry[]>([]);

  const addLogEntry = useCallback((event: string, details?: string) => {
    setTestLog(prev => [...prev, {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date(),
      details,
    }]);
  }, []);

  const startTestSession = () => {
    setIsTestActive(true);
    setActiveView('home');
    setMessages([]);
    setTestLog([]);
    addLogEntry('Test session started', `Widget: ${config.company_name || 'Widget'}`);
    toast.success('Test session started', {
      description: 'Interact with the widget as a visitor would',
    });
  };

  const endTestSession = () => {
    setIsTestActive(false);
    setActiveView('home');
    addLogEntry('Test session ended');
    toast.info('Test session ended');
  };

  const handleStartChat = () => {
    setActiveView('chat');
    addLogEntry('Chat initiated', 'Visitor started live chat');
    
    // Simulate agent connection after a delay
    setTimeout(() => {
      addLogEntry('Agent connected', 'Sarah from Support joined the chat');
      setIsAgentTyping(true);
      
      setTimeout(() => {
        setIsAgentTyping(false);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          content: "Hi there! I'm Sarah from Support. How can I help you today?",
          sender: 'agent',
          timestamp: new Date(),
        }]);
        addLogEntry('Agent message received');
      }, 2000);
    }, 1500);
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const message: TestMessage = {
      id: crypto.randomUUID(),
      content: inputValue.trim(),
      sender: 'visitor',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    addLogEntry('Visitor message sent', inputValue.trim());
    setInputValue('');

    // Simulate agent typing and response
    setTimeout(() => {
      setIsAgentTyping(true);
      addLogEntry('Agent is typing...');
      
      setTimeout(() => {
        setIsAgentTyping(false);
        const responses = [
          "I understand. Let me help you with that.",
          "Thanks for reaching out! I'll look into this for you.",
          "Great question! Here's what I can tell you...",
          "I'd be happy to assist you with that.",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          content: randomResponse,
          sender: 'agent',
          timestamp: new Date(),
        }]);
        addLogEntry('Agent message received');
      }, 2000 + Math.random() * 1000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Widget Test Mode</AlertTitle>
        <AlertDescription>
          Test your widget as a visitor would experience it. Start a test session to simulate 
          live chat interactions. Messages are simulated and won't appear in your real inbox.
        </AlertDescription>
      </Alert>

      {/* Test Controls */}
      <div className="flex items-center gap-4">
        {!isTestActive ? (
          <Button onClick={startTestSession}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Test Session
          </Button>
        ) : (
          <Button variant="outline" onClick={endTestSession}>
            <StopCircle className="h-4 w-4 mr-2" />
            End Test Session
          </Button>
        )}
        {isTestActive && (
          <Badge variant="outline" className="border-green-500 text-green-600">
            Test Mode Active
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Widget Preview */}
        <div className="border-2 border-dashed rounded-xl p-6 bg-muted/30 flex items-center justify-center min-h-[500px]">
          {isTestActive ? (
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
                    {activeView === 'chat' && (
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
                  <Badge variant="outline" className="bg-white/20 border-white/30 text-white text-xs">
                    TEST
                  </Badge>
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

                    {config.enable_chat && (
                      <button
                        onClick={handleStartChat}
                        className="w-full p-3 rounded-lg border hover:bg-muted/50 text-left flex items-center gap-3 transition-colors"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: `${config.primary_color}20` }}
                        >
                          <MessageCircle className="h-5 w-5" style={{ color: config.primary_color }} />
                        </div>
                        <div>
                          <div className="font-medium text-sm">Start live chat</div>
                          <div className="text-xs text-muted-foreground">Talk to us in real-time</div>
                        </div>
                      </button>
                    )}
                  </div>
                )}

                {activeView === 'chat' && (
                  <div className="space-y-4">
                    {/* Messages */}
                    <div className="h-[280px] overflow-y-auto space-y-3">
                      {messages.map((msg) => (
                        <div 
                          key={msg.id}
                          className={`flex ${msg.sender === 'visitor' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                              msg.sender === 'visitor' 
                                ? 'rounded-br-sm text-white'
                                : 'rounded-bl-sm bg-muted'
                            }`}
                            style={msg.sender === 'visitor' ? { backgroundColor: config.primary_color } : {}}
                          >
                            {msg.sender === 'agent' && (
                              <span className="text-xs text-muted-foreground block mb-1">
                                Sarah from Support
                              </span>
                            )}
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      
                      {/* Typing Indicator */}
                      {isAgentTyping && (
                        <div className="flex justify-start">
                          <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-muted">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Type a message..." 
                        className="flex-1"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button 
                        size="icon" 
                        onClick={handleSendMessage}
                        style={{ backgroundColor: config.primary_color }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
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
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Start a test session to interact with your widget</p>
            </div>
          )}
        </div>

        {/* Test Session Log */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Session Log
            </h4>
            {testLog.length > 0 ? (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {testLog.map((entry) => (
                  <div 
                    key={entry.id}
                    className="text-sm p-2 rounded bg-muted/50 border"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.event}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {entry.details}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Session events will appear here
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
