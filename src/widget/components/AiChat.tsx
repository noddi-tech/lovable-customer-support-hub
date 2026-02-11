import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { sendAiMessage, streamAiMessage } from '../api';
import { getWidgetTranslations } from '../translations';
import { AiFeedback } from './AiFeedback';
import { parseMessageBlocks, MessageBlock } from '../utils/parseMessageBlocks';
import { getBlock } from './blocks';

interface AiChatMessage {
  id: string;
  serverId?: string;
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
  onLogEvent?: (event: string, details?: string, type?: 'info' | 'tool' | 'error' | 'success') => void;
}

const STORAGE_KEY = 'noddi_ai_chat_messages';
const CONVERSATION_ID_KEY = 'noddi_ai_conversation_id';
const VERIFIED_PHONE_KEY = 'noddi_ai_verified_phone';

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

// Simple markdown-like formatting for AI responses
function formatAiResponse(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n/g, '<br/>');
}

// ========== Registry-Driven Block Renderer ==========

interface MessageBlockRendererProps {
  blocks: MessageBlock[];
  messageId: string;
  primaryColor: string;
  widgetKey: string;
  conversationId: string | null;
  language: string;
  usedBlocks: Set<string>;
  onActionSelect: (option: string, blockKey: string) => void;
  onPhoneVerified: (phone: string, blockKey: string) => void;
  onLogEvent?: AiChatProps['onLogEvent'];
}

const MessageBlockRenderer: React.FC<MessageBlockRendererProps> = ({
  blocks, messageId, primaryColor, widgetKey, conversationId, language, usedBlocks, onActionSelect, onPhoneVerified, onLogEvent,
}) => {
  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === 'text') {
          return (
            <div
              key={idx}
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(formatAiResponse(block.content)),
              }}
            />
          );
        }

        const def = getBlock(block.type);
        if (!def) return null;

        // Build the onAction handler — phone_verify uses a special handler
        const handleAction = def.type === 'phone_verify'
          ? (value: string, blockKey: string) => onPhoneVerified(value, blockKey)
          : (value: string, blockKey: string) => {
              // For non-API blocks, persist selection in localStorage
              if (!def.requiresApi) {
                localStorage.setItem(`noddi_action_${blockKey}`, value);
              }
              onActionSelect(value, blockKey);
            };

        return (
          <def.component
            key={idx}
            primaryColor={primaryColor}
            messageId={messageId}
            blockIndex={idx}
            usedBlocks={usedBlocks}
            onAction={handleAction}
            data={block}
            // API props only if needed
            {...(def.requiresApi ? { widgetKey, conversationId, language, onLogEvent } : {})}
          />
        );
      })}
    </>
  );
};

// ========== Main Component ==========

export const AiChat: React.FC<AiChatProps> = ({
  widgetKey, primaryColor, language, agentsOnline, enableChat, enableContactForm,
  onTalkToHuman, onEmailConversation, onBack, onLogEvent,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>(loadMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(CONVERSATION_ID_KEY));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usedBlocks, setUsedBlocks] = useState<Set<string>>(new Set());
  const [verifiedPhone, setVerifiedPhone] = useState(() => localStorage.getItem(VERIFIED_PHONE_KEY) || '');

  const t = getWidgetTranslations(language);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, streamingContent]);

  useEffect(() => { saveMessages(messages); }, [messages]);

  useEffect(() => {
    if (conversationId) localStorage.setItem(CONVERSATION_ID_KEY, conversationId);
  }, [conversationId]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: 'greeting', role: 'assistant', content: t.aiGreeting, timestamp: new Date() }]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isPhoneVerified = !!verifiedPhone;

  const sendMessage = useCallback(async (content: string, phoneOverride?: string) => {
    if (!content || isLoading) return;
    const effectivePhone = phoneOverride || verifiedPhone;
    const effectiveVerified = !!effectivePhone;

    const userMessage: AiChatMessage = { id: `user_${Date.now()}`, role: 'user', content, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');
    onLogEvent?.('User message', content.slice(0, 100), 'info');

    try {
      const history = [...messages, userMessage]
        .filter((m) => m.id !== 'greeting')
        .map((m) => ({ role: m.role, content: m.content }));

      let fullReply = '';
      let gotStream = false;
      let serverMessageId: string | undefined;

      try {
        await streamAiMessage(widgetKey, history, effectivePhone || undefined, undefined, language, conversationId || undefined,
          (token) => { gotStream = true; fullReply += token; setStreamingContent(fullReply); },
          (meta) => { if (meta.conversationId) setConversationId(meta.conversationId); if (meta.messageId) serverMessageId = meta.messageId; },
          effectiveVerified,
        );
      } catch {
        if (!gotStream) {
          const result = await sendAiMessage(widgetKey, history, effectivePhone || undefined, undefined, language);
          fullReply = typeof result === 'string' ? result : result.reply;
          if (result.conversationId) setConversationId(result.conversationId);
          if (result.messageId) serverMessageId = result.messageId;
        }
        onLogEvent?.('AI stream fallback', 'Used non-streaming endpoint', 'info');
      }

      if (fullReply) {
        const aiMsg: AiChatMessage = { id: `ai_${Date.now()}`, serverId: serverMessageId, role: 'assistant', content: fullReply, timestamp: new Date() };
        setMessages((prev) => [...prev, aiMsg]);
        onLogEvent?.('AI response', fullReply.slice(0, 100), 'success');
      }
    } catch (err) {
      console.error('[Noddi Widget] AI chat error:', err);
      setMessages((prev) => [...prev, { id: `error_${Date.now()}`, role: 'assistant', content: t.aiError, timestamp: new Date() }]);
    }

    setStreamingContent('');
    setIsLoading(false);
  }, [isLoading, messages, widgetKey, verifiedPhone, language, conversationId, t]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content) return;
    setInputValue('');
    await sendMessage(content);
  }, [inputValue, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleActionSelect = useCallback((option: string, blockKey: string) => {
    localStorage.setItem(`noddi_action_${blockKey}`, option);
    setUsedBlocks((prev) => new Set(prev).add(blockKey));
    sendMessage(option);
  }, [sendMessage]);

  const handlePhoneVerified = useCallback((phone: string, blockKey: string) => {
    setVerifiedPhone(phone);
    setUsedBlocks((prev) => new Set(prev).add(blockKey));
    setTimeout(() => { sendMessage('Jeg har verifisert telefonnummeret mitt. Hva kan du hjelpe meg med?', phone); }, 500);
  }, [sendMessage]);

  const buildTranscript = (): string => {
    return messages.filter((m) => m.id !== 'greeting').map((m) => `${m.role === 'user' ? 'Customer' : 'AI Assistant'}: ${m.content}`).join('\n\n');
  };

  const canEscalate = (agentsOnline && enableChat) || enableContactForm;

  const handleNewConversation = useCallback(() => {
    setMessages([{ id: 'greeting', role: 'assistant', content: t.aiGreeting, timestamp: new Date() }]);
    setConversationId(null);
    setStreamingContent('');
    setInputValue('');
    setUsedBlocks(new Set());
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
  }, [t]);

  return (
    <div className="noddi-widget-chat">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="noddi-widget-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          {t.back}
        </button>
        {messages.length > 1 && (
          <button className="noddi-ai-new-conversation-btn" onClick={handleNewConversation} title={t.startNewConversation} style={{ color: primaryColor }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
            {t.startNewConversation}
          </button>
        )}
      </div>

      <div className="noddi-chat-messages">
        {messages.map((message) => {
          const blocks = message.role === 'assistant'
            ? parseMessageBlocks(message.content)
            : [{ type: 'text' as const, content: message.content }];

          return (
            <div key={message.id} className={`noddi-chat-message ${message.role === 'user' ? 'noddi-chat-message-customer' : 'noddi-chat-message-agent'}`}>
              {message.role === 'assistant' && <span className="noddi-chat-message-sender">{t.aiAssistant}</span>}
              <div className="noddi-chat-message-bubble" style={message.role === 'user' ? { backgroundColor: primaryColor } : {}}>
                <MessageBlockRenderer
                  blocks={blocks} messageId={message.id} primaryColor={primaryColor}
                  widgetKey={widgetKey} conversationId={conversationId} language={language}
                  usedBlocks={usedBlocks} onActionSelect={handleActionSelect} onPhoneVerified={handlePhoneVerified} onLogEvent={onLogEvent}
                />
              </div>
              {message.role === 'assistant' && message.id !== 'greeting' && conversationId && message.serverId && (
                <AiFeedback messageId={message.serverId} conversationId={conversationId} widgetKey={widgetKey} primaryColor={primaryColor} />
              )}
              <span className="noddi-chat-message-time">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          );
        })}

        {streamingContent && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <span className="noddi-chat-message-sender">{t.aiAssistant}</span>
            <div className="noddi-chat-message-bubble" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatAiResponse(streamingContent)) }} />
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <div className="noddi-chat-typing"><span></span><span></span><span></span></div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {canEscalate && messages.length > 2 && (
        <div className="noddi-ai-escalation">
          {agentsOnline && enableChat ? (
            <button className="noddi-ai-escalation-btn" onClick={onTalkToHuman}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              {t.talkToHuman}
            </button>
          ) : enableContactForm ? (
            <button className="noddi-ai-escalation-btn" onClick={() => onEmailConversation(buildTranscript())}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              {t.emailConversation}
            </button>
          ) : null}
        </div>
      )}

      <div className="noddi-chat-input-container">
        <input type="text" className="noddi-chat-input" placeholder={t.askAnything} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} disabled={isLoading} />
        <button className="noddi-chat-send" onClick={handleSend} disabled={!inputValue.trim() || isLoading} style={{ backgroundColor: primaryColor }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  );
};
