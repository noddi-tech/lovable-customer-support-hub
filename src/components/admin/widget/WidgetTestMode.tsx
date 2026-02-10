import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  StopCircle, 
  Send, 
  Info,
  Bot,
  User,
  Sparkles,
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
  role: 'user' | 'assistant';
  timestamp: Date;
  toolsUsed?: string[];
}

interface TestLogEntry {
  id: string;
  event: string;
  timestamp: Date;
  details?: string;
  type?: 'info' | 'tool' | 'error' | 'success';
}

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export const WidgetTestMode: React.FC<WidgetTestModeProps> = ({ config }) => {
  const [isTestActive, setIsTestActive] = useState(false);
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [testLog, setTestLog] = useState<TestLogEntry[]>([]);
  const [testPhone, setTestPhone] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingContent]);

  const addLogEntry = useCallback((event: string, details?: string, type: 'info' | 'tool' | 'error' | 'success' = 'info') => {
    setTestLog(prev => [...prev, {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date(),
      details,
      type,
    }]);
  }, []);

  const startTestSession = () => {
    setIsTestActive(true);
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: "Hi! 👋 I'm Noddi's AI assistant. I can help you with questions about our services, look up your bookings, and more. How can I help you?",
      timestamp: new Date(),
    }]);
    setTestLog([]);
    addLogEntry('Test session started', `Widget: ${config.company_name || 'Widget'} (${config.widget_key})`, 'success');
  };

  const endTestSession = () => {
    setIsTestActive(false);
    setMessages([]);
    setStreamingContent('');
    addLogEntry('Test session ended', undefined, 'info');
    toast.info('Test session ended');
  };

  const handleSendMessage = async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    const userMessage: TestMessage = {
      id: crypto.randomUUID(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingContent('');
    addLogEntry('User message', content, 'info');

    try {
      const history = messages
        .filter(m => m.id !== 'greeting')
        .concat(userMessage)
        .map(m => ({ role: m.role, content: m.content }));

      addLogEntry('Calling AI edge function', 'POST /widget-ai-chat (test: true, stream: true)', 'tool');

      const response = await fetch(`${API_BASE}/widget-ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetKey: config.widget_key,
          messages: history,
          visitorPhone: testPhone || undefined,
          language: 'no',
          test: true,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      let fullReply = '';

      if (contentType.includes('text/event-stream')) {
        addLogEntry('SSE stream started', undefined, 'success');
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token') {
                fullReply += data.content;
                setStreamingContent(fullReply);
              } else if (data.type === 'done') {
                addLogEntry('Stream completed', `${fullReply.length} chars`, 'success');
              }
            } catch { /* skip */ }
          }
        }
      } else {
        const data = await response.json();
        fullReply = data.reply || '';
        addLogEntry('Non-streaming response', `${fullReply.length} chars`, 'info');
      }

      if (fullReply) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          content: fullReply,
          role: 'assistant',
          timestamp: new Date(),
        }]);
        addLogEntry('AI response received', fullReply.slice(0, 100) + (fullReply.length > 100 ? '...' : ''), 'success');
      }
    } catch (err: any) {
      addLogEntry('Error', err.message, 'error');
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        content: `Error: ${err.message}`,
        role: 'assistant',
        timestamp: new Date(),
      }]);
    }

    setStreamingContent('');
    setIsLoading(false);
  };

  const logTypeStyles: Record<string, string> = {
    info: 'bg-muted/50 border',
    tool: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    success: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>AI Bot Test Mode</AlertTitle>
        <AlertDescription>
          Test the AI assistant with real knowledge base queries and booking lookups. 
          Messages use the <code className="text-xs bg-muted px-1 rounded">test: true</code> flag — conversations are not persisted.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-4">
        {!isTestActive ? (
          <Button onClick={startTestSession}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start AI Test
          </Button>
        ) : (
          <Button variant="outline" onClick={endTestSession}>
            <StopCircle className="h-4 w-4 mr-2" />
            End Test
          </Button>
        )}
        {isTestActive && (
          <>
            <Badge variant="outline" className="border-green-500 text-green-600">
              AI Test Active
            </Badge>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-sm text-muted-foreground whitespace-nowrap">Test phone:</label>
              <Input
                className="w-40 h-8 text-sm"
                placeholder="+47..."
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chat Preview */}
        <div className="border-2 border-dashed rounded-xl p-6 bg-muted/30 flex items-center justify-center min-h-[500px]">
          {isTestActive ? (
            <div 
              className="bg-background border shadow-2xl rounded-xl w-[360px] overflow-hidden flex flex-col"
              style={{ boxShadow: `0 25px 60px -15px ${config.primary_color}50`, maxHeight: '520px' }}
            >
              {/* Header */}
              <div className="p-3 text-white flex items-center justify-between" style={{ backgroundColor: config.primary_color }}>
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <span className="font-medium text-sm">{config.company_name || 'AI Assistant'}</span>
                </div>
                <Badge variant="outline" className="bg-white/20 border-white/30 text-white text-xs">TEST</Badge>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '360px' }}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-muted' : ''
                      }`} style={msg.role === 'assistant' ? { backgroundColor: `${config.primary_color}20` } : {}}>
                        {msg.role === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" style={{ color: config.primary_color }} />}
                      </div>
                      <div
                        className={`px-3 py-2 rounded-xl text-sm ${
                          msg.role === 'user'
                            ? 'rounded-br-sm text-white'
                            : 'rounded-bl-sm bg-muted'
                        }`}
                        style={msg.role === 'user' ? { backgroundColor: config.primary_color } : {}}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {streamingContent && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2 max-w-[85%]">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${config.primary_color}20` }}>
                        <Bot className="h-3 w-3" style={{ color: config.primary_color }} />
                      </div>
                      <div className="px-3 py-2 rounded-xl rounded-bl-sm bg-muted text-sm">
                        {streamingContent}
                      </div>
                    </div>
                  </div>
                )}

                {isLoading && !streamingContent && (
                  <div className="flex justify-start">
                    <div className="px-4 py-3 rounded-xl rounded-bl-sm bg-muted">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="Ask the AI bot..."
                  className="flex-1 h-9 text-sm"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  disabled={isLoading}
                />
                <Button
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  style={{ backgroundColor: config.primary_color }}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Start an AI test to chat with your bot</p>
            </div>
          )}
        </div>

        {/* Session Log */}
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Session Log
            </h4>
            {testLog.length > 0 ? (
              <div className="space-y-2 max-h-[440px] overflow-y-auto">
                {testLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`text-sm p-2 rounded ${logTypeStyles[entry.type || 'info']}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.event}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {entry.details && (
                      <p className="text-xs text-muted-foreground mt-1 break-words">
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
