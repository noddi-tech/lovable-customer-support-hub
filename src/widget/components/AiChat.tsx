import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { sendAiMessage, streamAiMessage, sendPhoneVerification, verifyPhonePin } from '../api';
import { getWidgetTranslations } from '../translations';
import { AiFeedback } from './AiFeedback';

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
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(CONVERSATION_ID_KEY));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Phone verification state
  const [verificationStep, setVerificationStep] = useState<'idle' | 'phone' | 'pin' | 'verified'>(() => {
    const verified = localStorage.getItem(VERIFIED_PHONE_KEY);
    return verified ? 'verified' : 'idle';
  });
  const [showVerificationPrompt, setShowVerificationPrompt] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const pinRef = useRef('');
  const [verifiedPhone, setVerifiedPhone] = useState(() => localStorage.getItem(VERIFIED_PHONE_KEY) || '');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSentMessage, setCodeSentMessage] = useState(false);

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

  // Auto-submit PIN when 6 digits entered (uses state, so fires after React update)
  useEffect(() => {
    if (pinInput.length === 6 && verificationStep === 'pin' && !isVerifying) {
      handleVerifyPin(pinInput);
    }
  }, [pinInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phone verification handlers
  const handleSendCode = useCallback(async () => {
    const phone = phoneInput.trim();
    if (!phone || isSendingCode) return;

    setIsSendingCode(true);
    setVerificationError(null);
    setCodeSentMessage(false);

    const result = await sendPhoneVerification(widgetKey, phone);

    if (result.success) {
      setVerificationStep('pin');
      setCodeSentMessage(true);
      setTimeout(() => setCodeSentMessage(false), 3000);
    } else {
      setVerificationError(result.error || 'Failed to send code');
    }

    setIsSendingCode(false);
  }, [phoneInput, isSendingCode, widgetKey]);

  const handleVerifyPin = useCallback(async (pinOverride?: string) => {
    const pin = (pinOverride || pinRef.current).trim();
    if (!pin || isVerifying) return;

    setIsVerifying(true);
    setVerificationError(null);

    const result = await verifyPhonePin(widgetKey, phoneInput.trim(), pin, conversationId || undefined);

    if (result.verified) {
      const phone = phoneInput.trim();
      setVerifiedPhone(phone);
      setVerificationStep('verified');
      localStorage.setItem(VERIFIED_PHONE_KEY, phone);
      localStorage.setItem('noddi_ai_phone', phone);
      setIsVerifying(false);
      // Auto-lookup: send message to trigger AI customer lookup
      setTimeout(() => {
        sendMessage('Telefonnummeret mitt er verifisert. Kan du slå opp kontoen min?', phone);
      }, 500);
      return;
    } else {
      const errorMsg = result.attemptsRemaining !== undefined && result.attemptsRemaining <= 0
        ? result.error || t.invalidPin
        : t.invalidPin;
      setVerificationError(errorMsg);
    }

    setIsVerifying(false);
  }, [isVerifying, widgetKey, phoneInput, conversationId, t]);

  const handleResendCode = useCallback(async () => {
    setVerificationError(null);
    setPinInput('');
    pinRef.current = '';
    await handleSendCode();
  }, [handleSendCode]);

  const handleSkipVerification = useCallback(() => {
    setVerificationStep('verified');
    localStorage.setItem('noddi_ai_phone_skipped', 'true');
  }, []);

  const isPhoneVerified = verificationStep === 'verified' && !!verifiedPhone;

  const sendMessage = useCallback(async (content: string, phoneOverride?: string) => {
    if (!content || isLoading) return;

    const effectivePhone = phoneOverride || verifiedPhone;
    const effectiveVerified = !!effectivePhone;

    const userMessage: AiChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const history = [...messages, userMessage]
        .filter((m) => m.id !== 'greeting')
        .map((m) => ({ role: m.role, content: m.content }));

      let fullReply = '';
      let gotStream = false;
      let serverMessageId: string | undefined;

      try {
        await streamAiMessage(
          widgetKey,
          history,
          effectivePhone || undefined,
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
          effectiveVerified,
        );
      } catch {
        if (!gotStream) {
          const result = await sendAiMessage(widgetKey, history, effectivePhone || undefined, undefined, language);
          fullReply = typeof result === 'string' ? result : result.reply;
          if (result.conversationId) setConversationId(result.conversationId);
          if (result.messageId) serverMessageId = result.messageId;
        }
      }

      if (fullReply) {
        const aiMsg: AiChatMessage = {
          id: `ai_${Date.now()}`,
          serverId: serverMessageId,
          role: 'assistant',
          content: fullReply,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Detect verification trigger in AI response
        if (!effectiveVerified && verificationStep === 'idle') {
          const lower = fullReply.toLowerCase();
          const verificationKeywords = ['verifiser', 'verify your phone', 'telefonnummer', 'bekreft telefon', 'phone verification', 'verifisere'];
          if (verificationKeywords.some(kw => lower.includes(kw))) {
            setShowVerificationPrompt(true);
            setVerificationStep('phone');
          }
        }
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
  }, [isLoading, messages, widgetKey, verifiedPhone, language, conversationId, t, verificationStep]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content) return;
    setInputValue('');
    await sendMessage(content);
  }, [inputValue, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const buildTranscript = (): string => {
    return messages
      .filter((m) => m.id !== 'greeting')
      .map((m) => `${m.role === 'user' ? 'Customer' : 'AI Assistant'}: ${m.content}`)
      .join('\n\n');
  };

  const canEscalate = (agentsOnline && enableChat) || enableContactForm;

  const handleNewConversation = useCallback(() => {
    setMessages([{
      id: 'greeting',
      role: 'assistant',
      content: t.aiGreeting,
      timestamp: new Date(),
    }]);
    setConversationId(null);
    setStreamingContent('');
    setInputValue('');
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
  }, [t]);

  return (
    <div className="noddi-widget-chat">
      {/* Back button + New conversation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="noddi-widget-back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          {t.back}
        </button>
        {messages.length > 1 && (
          <button
            className="noddi-ai-new-conversation-btn"
            onClick={handleNewConversation}
            title={t.startNewConversation}
            style={{ color: primaryColor }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"></path>
            </svg>
            {t.startNewConversation}
          </button>
        )}
      </div>

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

        {/* Typing indicator */}
        {isLoading && !streamingContent && (
          <div className="noddi-chat-message noddi-chat-message-agent">
            <div className="noddi-chat-typing">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {/* Inline phone verification prompt */}
        {showVerificationPrompt && verificationStep === 'phone' && (
          <div className="noddi-ai-phone-prompt" style={{ margin: '8px 0' }}>
            <p className="noddi-ai-phone-label">{t.verifyPhone}</p>
            <div className="noddi-ai-phone-input-row">
              <div className="noddi-phone-input-wrapper">
                <span className="noddi-phone-prefix">+47</span>
                <input
                  type="tel"
                  className="noddi-phone-input"
                  placeholder="XXX XX XXX"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendCode(); }}
                />
              </div>
              <button
                className="noddi-ai-phone-submit"
                onClick={handleSendCode}
                style={{ backgroundColor: primaryColor }}
                disabled={!phoneInput.trim() || isSendingCode}
              >
                {isSendingCode ? (
                  <svg className="noddi-widget-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                ) : '→'}
              </button>
            </div>
            {verificationError && (
              <p className="noddi-verification-error">{verificationError}</p>
            )}
            <button className="noddi-ai-skip-phone" onClick={handleSkipVerification}>
              {t.skipPhone}
            </button>
          </div>
        )}

        {/* Inline PIN entry */}
        {showVerificationPrompt && verificationStep === 'pin' && (
          <div className="noddi-ai-phone-prompt" style={{ margin: '8px 0' }}>
            <p className="noddi-ai-phone-label">{t.enterPin}</p>
            {codeSentMessage && (
              <p className="noddi-verification-success">{t.codeSent}</p>
            )}
            <div className="noddi-ai-pin-input-row">
              <div className="noddi-otp-container">
                <div className="noddi-otp-group">
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      className="noddi-otp-slot"
                      maxLength={1}
                      value={pinInput[i] || ''}
                      autoFocus={i === 0}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (!val) return;
                        const newPin = pinRef.current.split('');
                        newPin[i] = val[0];
                        const joined = newPin.join('').slice(0, 6);
                        pinRef.current = joined;
                        setPinInput(joined);
                        const next = e.target.nextElementSibling as HTMLInputElement
                          || e.target.parentElement?.nextElementSibling?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                        if (next && val) next.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !pinInput[i]) {
                          const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                            || ((e.target as HTMLElement).parentElement?.previousElementSibling?.previousElementSibling?.querySelector('input:last-child') as HTMLInputElement);
                          if (prev) prev.focus();
                        }
                        if (e.key === 'Enter' && pinInput.length >= 4) handleVerifyPin();
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        setPinInput(pasted);
                        const slots = (e.target as HTMLElement).closest('.noddi-otp-container')?.querySelectorAll('.noddi-otp-slot');
                        if (slots && slots[Math.min(pasted.length, 5)]) (slots[Math.min(pasted.length, 5)] as HTMLInputElement).focus();
                      }}
                    />
                  ))}
                </div>
                <div className="noddi-otp-separator">·</div>
                <div className="noddi-otp-group">
                  {[3, 4, 5].map((i) => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      className="noddi-otp-slot"
                      maxLength={1}
                      value={pinInput[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (!val) return;
                        const newPin = pinRef.current.split('');
                        newPin[i] = val[0];
                        const joined = newPin.join('').slice(0, 6);
                        pinRef.current = joined;
                        setPinInput(joined);
                        const next = e.target.nextElementSibling as HTMLInputElement;
                        if (next && val) next.focus();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !pinInput[i]) {
                          const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                            || ((e.target as HTMLElement).parentElement?.previousElementSibling?.previousElementSibling?.querySelector('input:last-child') as HTMLInputElement);
                          if (prev) prev.focus();
                        }
                        if (e.key === 'Enter' && pinInput.length >= 4) handleVerifyPin();
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        setPinInput(pasted);
                        const slots = (e.target as HTMLElement).closest('.noddi-otp-container')?.querySelectorAll('.noddi-otp-slot');
                        if (slots && slots[Math.min(pasted.length, 5)]) (slots[Math.min(pasted.length, 5)] as HTMLInputElement).focus();
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                className="noddi-ai-phone-submit"
                onClick={() => handleVerifyPin()}
                style={{ backgroundColor: primaryColor }}
                disabled={pinInput.length < 4 || isVerifying}
              >
                {isVerifying ? (
                  <svg className="noddi-widget-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                  </svg>
                ) : '✓'}
              </button>
            </div>
            {verificationError && (
              <p className="noddi-verification-error">{verificationError}</p>
            )}
            <div className="noddi-verification-actions">
              <button className="noddi-ai-skip-phone" onClick={handleResendCode}>
                {t.resendCode}
              </button>
              <button className="noddi-ai-skip-phone" onClick={() => { setVerificationStep('phone'); setVerificationError(null); setPinInput(''); pinRef.current = ''; }}>
                {t.back}
              </button>
            </div>
          </div>
        )}

        {/* Inline verified badge */}
        {showVerificationPrompt && verificationStep === 'verified' && verifiedPhone && (
          <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>{t.phoneVerified}: {verifiedPhone}</span>
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
