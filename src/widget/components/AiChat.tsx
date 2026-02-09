import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sendAiMessage } from '../api';
import { getWidgetTranslations } from '../translations';

interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AiChatProps {
  widgetKey: string;
  primaryColor: string;
  language: string;
  agentsOnline: boolean;
  enableChat: boolean;
  enableContactForm: boolean;
  onTalkToHuman: () => void;
  onEmailConversation: (transcript: string) => void;
  onBack: () => void;
}

const STORAGE_KEY = 'noddi_ai_chat_messages';

function loadMessages(): AiChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only keep messages from the last 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return parsed
        .filter((m: any) => new Date(m.timestamp).getTime() > cutoff)
        .map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
    }
  } catch { /* ignore */ }
  return [];
}

function saveMessages(messages: AiChatMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch { /* ignore */ }
}

export const AiChat: React.FC<AiChatProps> = ({
  widgetKey,
  primaryColor,
  language,
  agentsOnline,
  enableChat,
  enableContactForm,
  onTalkToHuman,
  onEmailConversation,
  onBack,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>(loadMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visitorPhone, setVisitorPhone] = useState(() => localStorage.getItem('noddi_ai_phone') || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = getWidgetTranslations(language);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist messages
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Show greeting on first load
  useEffect(() => {
    if (messages.length === 0) {
      const greeting: AiChatMessage = {
        id: 'greeting',
        role: 'assistant',
        content: t.aiGreeting,
        timestamp: new Date(),
      };
      setMessages([greeting]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isLoading) return;

    const userMessage: AiChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build history for the API (exclude greeting)
      const history = [...messages, userMessage]
        .filter((m) => m.id !== 'greeting')
        .map((m) => ({ role: m.role, content: m.content }));

      const reply = await sendAiMessage(
        widgetKey,
        history,
        visitorPhone || undefined,
        undefined,
        language,
      );

      const assistantMessage: AiChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error('[Noddi Widget] AI chat error:', err);
      const errorMessage: AiChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: t.aiError,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }

    setIsLoading(false);
  }, [inputValue, isLoading, messages, widgetKey, visitorPhone, language, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePhoneSubmit = () => {
    if (visitorPhone.trim()) {
      localStorage.setItem('noddi_ai_phone', visitorPhone.trim());
    }
  };

  const buildTranscript = (): string => {
    return messages
      .filter((m) => m.id !== 'greeting')
      .map((m) => `${m.role === 'user' ? 'Customer' : 'AI Assistant'}: ${m.content}`)
      .join('\n\n');
  };

  const handleClearChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    const greeting: AiChatMessage = {
      id: 'greeting',
      role: 'assistant',
      content: t.aiGreeting,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  };

  const canEscalate = (agentsOnline && enableChat) || enableContactForm;

  return (
    <div className="noddi-widget-chat">
      {/* Back button */}
      <button className="noddi-widget-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        {t.back}
      </button>

      {/* Phone prompt */}
      {!visitorPhone && (
        <div className="noddi-ai-phone-prompt">
          <p className="noddi-ai-phone-label">{t.enterPhone}</p>
          <div className="noddi-ai-phone-input-row">
            <input
              type="tel"
              className="noddi-chat-input"
              placeholder="+47..."
              value={visitorPhone}
              onChange={(e) => setVisitorPhone(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneSubmit(); }}
            />
            <button
              className="noddi-ai-phone-submit"
              onClick={handlePhoneSubmit}
              style={{ backgroundColor: primaryColor }}
              disabled={!visitorPhone.trim()}
            >
              ✓
            </button>
          </div>
          <button className="noddi-ai-skip-phone" onClick={() => setVisitorPhone('skip')}>
            {t.skipPhone}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="noddi-chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`noddi-chat-message ${
              message.role === 'user' ? 'noddi-chat-message-customer' : 'noddi-chat-message-agent'
            }`}
          >
            {message.role === 'assistant' && (
              <span className="noddi-chat-message-sender">{t.aiAssistant}</span>
            )}
            <div
              className="noddi-chat-message-bubble"
              style={message.role === 'user' ? { backgroundColor: primaryColor } : {}}
              dangerouslySetInnerHTML={{
                __html: formatAiResponse(message.content),
              }}
            />
            <span className="noddi-chat-message-time">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <div className="noddi-chat-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Escalation buttons */}
      {canEscalate && messages.length > 2 && (
        <div className="noddi-ai-escalation">
          {agentsOnline && enableChat ? (
            <button className="noddi-ai-escalation-btn" onClick={onTalkToHuman}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              {t.talkToHuman}
            </button>
          ) : enableContactForm ? (
            <button
              className="noddi-ai-escalation-btn"
              onClick={() => onEmailConversation(buildTranscript())}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              {t.emailConversation}
            </button>
          ) : null}
        </div>
      )}

      {/* Input */}
      <div className="noddi-chat-input-container">
        <input
          type="text"
          className="noddi-chat-input"
          placeholder={t.askAnything}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <button
          className="noddi-chat-send"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          style={{ backgroundColor: primaryColor }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  );
};

// Simple markdown-like formatting for AI responses
function formatAiResponse(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Bullet points
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    // Fix double-nested ul
    .replace(/<\/ul>\s*<ul>/g, '')
    // Line breaks
    .replace(/\n/g, '<br/>');
}
