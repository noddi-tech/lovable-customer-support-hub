import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  PlayCircle, 
  StopCircle, 
  Info,
  Bot,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { AiChat } from '@/widget/components/AiChat';
import '@/widget/styles/widget.css';

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
  language?: string;
}

interface WidgetTestModeProps {
  config: WidgetConfig;
}

interface TestLogEntry {
  id: string;
  event: string;
  timestamp: Date;
  details?: string;
  type?: 'info' | 'tool' | 'error' | 'success';
}

export const WidgetTestMode: React.FC<WidgetTestModeProps> = ({ config }) => {
  const [isTestActive, setIsTestActive] = useState(false);
  const [testLog, setTestLog] = useState<TestLogEntry[]>([]);

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
    setTestLog([]);
    addLogEntry('Test session started', `Widget: ${config.company_name || 'Widget'} (${config.widget_key})`, 'success');
  };

  const endTestSession = () => {
    setIsTestActive(false);
    addLogEntry('Test session ended', undefined, 'info');
    toast.info('Test session ended');
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
          Test the AI assistant with the production widget — identical to what end-users see.
          Phone verification, OTP, and all features work exactly like in production.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-4">
        {!isTestActive ? (
          <Button onClick={startTestSession}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start AI Test
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={endTestSession}>
              <StopCircle className="h-4 w-4 mr-2" />
              End Test
            </Button>
            <Button variant="ghost" size="sm" onClick={() => {
              localStorage.removeItem('noddi_ai_chat_messages');
              localStorage.removeItem('noddi_ai_conversation_id');
              localStorage.removeItem('noddi_ai_verified_phone');
              addLogEntry('Session cleared', 'All widget state reset (messages, phone, conversation)', 'info');
              toast.info('Widget session cleared — reload the test to start fresh');
            }}>
              Clear Session
            </Button>
          </>
        )}
        {isTestActive && (
          <Badge variant="outline" className="border-green-500 text-green-600">
            AI Test Active
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Widget Preview */}
        <div className="border-2 border-dashed rounded-xl p-2 bg-muted/30 flex items-stretch justify-center h-[calc(100vh-200px)] overflow-hidden relative z-0">
          {isTestActive ? (
            <div
              className="noddi-widget-container"
              style={{ position: 'relative', width: '380px', height: '100%', maxHeight: '100%' }}
            >
              <div
                className="noddi-widget-panel"
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  width: '100%',
                  height: '100%',
                  maxHeight: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: `0 25px 60px -15px ${config.primary_color}50`,
                }}
              >
                {/* Widget header */}
                <div
                  className="noddi-widget-header"
                  style={{ backgroundColor: config.primary_color }}
                >
                  <div className="noddi-widget-header-content">
                    <div className="noddi-widget-header-text">
                      <h3 className="noddi-widget-title">{config.company_name || 'AI Assistant'}</h3>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white/20 border-white/30 text-white text-xs">TEST</Badge>
                </div>

                {/* Real AiChat component */}
                <AiChat
                  widgetKey={config.widget_key}
                  primaryColor={config.primary_color}
                  language={config.language || 'no'}
                  agentsOnline={false}
                  enableChat={false}
                  enableContactForm={false}
                  onTalkToHuman={() => addLogEntry('Escalation: Talk to human', undefined, 'tool')}
                  onEmailConversation={(transcript) => addLogEntry('Escalation: Email conversation', `${transcript.length} chars`, 'tool')}
                  onBack={() => addLogEntry('Back button clicked', undefined, 'info')}
                  onLogEvent={(event, details, type) => addLogEntry(event, details, type)}
                />
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
