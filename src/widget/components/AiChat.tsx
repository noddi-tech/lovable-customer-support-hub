import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { sendAiMessage, streamAiMessage } from '../api';
import { getWidgetTranslations } from '../translations';
import { AiFeedback } from './AiFeedback';

interface AiChatMessage {
  id: string;
  serverId?: string; // Server-side message ID for feedback
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
const CONVERSATION_ID_KEY = 'noddi_ai_conversation_id';

function loadMessages(): AiChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
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
  const [streamingContent, setStreamingContent] = useState('');
  const [visitorPhone, setVisitorPhone] = useState(() => localStorage.getItem('noddi_ai_phone') || '');
  const [phoneSkipped, setPhoneSkipped] = useState(() => localStorage.getItem('noddi_ai_phone_skipped') === 'true');
  const [phoneInput, setPhoneInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(CONVERSATION_ID_KEY));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = getWidgetTranslations(language);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingContent]);

  // Persist messages
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Persist conversation ID
  useEffect(() => {
    if (conversationId) {
      localStorage.setItem(CONVERSATION_ID_KEY, conversationId);
    }
  }, [conversationId]);

  // Show greeting on first load
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: t.aiGreeting,
        timestamp: new Date(),
      }]);
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
    setStreamingContent('');

    try {
      const history = [...messages, userMessage]
        .filter((m) => m.id !== 'greeting')
        .map((m) => ({ role: m.role, content: m.content }));

      // Try streaming first
      let fullReply = '';
      let gotStream = false;
      let serverMessageId: string | undefined;

      try {
        await streamAiMessage(
          widgetKey,
          history,
          visitorPhone || undefined,
          undefined,
          language,
          conversationId || undefined,
          (token) => {
            gotStream = true;
            fullReply += token;
            setStreamingContent(fullReply);
          },
          (meta) => {
            if (meta.conversationId) setConversationId(meta.conversationId);
            if (meta.messageId) serverMessageId = meta.messageId;
          },
        );
      } catch {
        // Fallback to non-streaming
        if (!gotStream) {
          const result = await sendAiMessage(widgetKey, history, visitorPhone || undefined, undefined, language);
          fullReply = typeof result === 'string' ? result : result.reply;
          if (result.conversationId) setConversationId(result.conversationId);
          if (result.messageId) serverMessageId = result.messageId;
        }
      }

      if (fullReply) {
        setMessages((prev) => [...prev, {
          id: `ai_${Date.now()}`,
          serverId: serverMessageId,
          role: 'assistant',
          content: fullReply,
          timestamp: new Date(),
        }]);
      }
    } catch (err) {
      console.error('[Noddi Widget] AI chat error:', err);
      setMessages((prev) => [...prev, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: t.aiError,
        timestamp: new Date(),
      }]);
    }

    setStreamingContent('');
    setIsLoading(false);
  }, [inputValue, isLoading, messages, widgetKey, visitorPhone, language, conversationId, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePhoneSubmit = () => {
    const phone = phoneInput.trim();
    if (phone) {
      setVisitorPhone(phone);
      localStorage.setItem('noddi_ai_phone', phone);
    }
  };

  const handlePhoneSkip = () => {
    setPhoneSkipped(true);
    localStorage.setItem('noddi_ai_phone_skipped', 'true');
  };

  const buildTranscript = (): string => {
    return messages
      .filter((m) => m.id !== 'greeting')
      .map((m) => `${m.role === 'user' ? 'Customer' : 'AI Assistant'}: ${m.content}`)
      .join('\n\n');
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
      {!visitorPhone && !phoneSkipped && (
        <div className="noddi-ai-phone-prompt">
          <p className="noddi-ai-phone-label">{t.enterPhone}</p>
          <div className="noddi-ai-phone-input-row">
            <input
              type="tel"
              className="noddi-chat-input"
              placeholder="+47..."
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneSubmit(); }}
            />
            <button
              className="noddi-ai-phone-submit"
              onClick={handlePhoneSubmit}
              style={{ backgroundColor: primaryColor }}
              disabled={!phoneInput.trim()}
            >
              ✓
            </button>
          </div>
          <button className="noddi-ai-skip-phone" onClick={handlePhoneSkip}>
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
                __html: DOMPurify.sanitize(formatAiResponse(message.content)),
              }}
            />
            {message.role === 'assistant' && message.id !== 'greeting' && conversationId && message.serverId && (
              <AiFeedback
                messageId={message.serverId}
                conversationId={conversationId}
                widgetKey={widgetKey}
                primaryColor={primaryColor}
              />
            )}
            <span className="noddi-chat-message-time">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {/* Streaming message */}
        {streamingContent && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <span className="noddi-chat-message-sender">{t.aiAssistant}</span>
            <div
              className="noddi-chat-message-bubble"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(formatAiResponse(streamingContent)),
              }}
            />
          </div>
        )}

        {/* Typing indicator (only when loading and not streaming yet) */}
        {isLoading && !streamingContent && (
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
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n/g, '<br/>');
}
