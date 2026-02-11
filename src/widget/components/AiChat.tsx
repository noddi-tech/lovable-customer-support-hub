import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { sendAiMessage, streamAiMessage, sendPhoneVerification, verifyPhonePin } from '../api';
import { getWidgetTranslations } from '../translations';
import { AiFeedback } from './AiFeedback';
import { parseMessageBlocks, MessageBlock } from '../utils/parseMessageBlocks';

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

// ========== Inline Block Components ==========

interface ActionMenuBlockProps {
  options: string[];
  primaryColor: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onSelect: (option: string, blockKey: string) => void;
}

const ActionMenuBlock: React.FC<ActionMenuBlockProps> = ({
  options,
  primaryColor,
  messageId,
  blockIndex,
  usedBlocks,
  onSelect,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selectedOption = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  return (
    <div className="noddi-action-menu" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
      {options.map((option, i) => {
        const isSelected = selectedOption === option;
        return (
          <button
            key={i}
            className="noddi-action-pill"
            disabled={isUsed}
            onClick={() => onSelect(option, blockKey)}
            style={{
              padding: '8px 14px',
              borderRadius: '18px',
              border: `1.5px solid ${primaryColor}`,
              background: isSelected ? primaryColor : 'transparent',
              color: isSelected ? '#fff' : primaryColor,
              fontSize: '13px',
              fontWeight: 500,
              cursor: isUsed ? 'default' : 'pointer',
              opacity: isUsed && !isSelected ? 0.45 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
};

interface PhoneVerifyBlockProps {
  primaryColor: string;
  widgetKey: string;
  conversationId: string | null;
  language: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onVerified: (phone: string) => void;
  onLogEvent?: AiChatProps['onLogEvent'];
}

const PhoneVerifyBlock: React.FC<PhoneVerifyBlockProps> = ({
  primaryColor,
  widgetKey,
  conversationId,
  language,
  messageId,
  blockIndex,
  usedBlocks,
  onVerified,
  onLogEvent,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const t = getWidgetTranslations(language);

  const [step, setStep] = useState<'phone' | 'pin' | 'verified'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const pinRef = useRef('');
  const [error, setError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSentMessage, setCodeSentMessage] = useState(false);

  // Check if already verified
  const alreadyVerified = !!localStorage.getItem(VERIFIED_PHONE_KEY);

  useEffect(() => {
    if (pinInput.length === 6 && step === 'pin' && !isVerifying) {
      handleVerifyPin(pinInput);
    }
  }, [pinInput]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isUsed || alreadyVerified) {
    const phone = localStorage.getItem(VERIFIED_PHONE_KEY);
    if (phone) {
      return (
        <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{t.phoneVerified}: {phone}</span>
        </div>
      );
    }
    return null;
  }

  const handleSendCode = async () => {
    const phone = phoneInput.trim();
    if (!phone || isSendingCode) return;
    setIsSendingCode(true);
    setError(null);
    setCodeSentMessage(false);

    const result = await sendPhoneVerification(widgetKey, phone);
    if (result.success) {
      setStep('pin');
      setCodeSentMessage(true);
      onLogEvent?.('Verification code sent', phone, 'tool');
      setTimeout(() => setCodeSentMessage(false), 3000);
    } else {
      setError(result.error || 'Failed to send code');
      onLogEvent?.('Verification failed', result.error || 'Failed to send code', 'error');
    }
    setIsSendingCode(false);
  };

  const handleVerifyPin = async (pinOverride?: string) => {
    const pin = (pinOverride || pinRef.current).trim();
    if (!pin || isVerifying) return;
    setIsVerifying(true);
    setError(null);

    const result = await verifyPhonePin(widgetKey, phoneInput.trim(), pin, conversationId || undefined);
    if (result.verified) {
      const phone = phoneInput.trim();
      setStep('verified');
      localStorage.setItem(VERIFIED_PHONE_KEY, phone);
      localStorage.setItem('noddi_ai_phone', phone);
      onLogEvent?.('Phone verified', phone, 'success');
      onVerified(phone);
    } else {
      const errorMsg = result.attemptsRemaining !== undefined && result.attemptsRemaining <= 0
        ? result.error || t.invalidPin
        : t.invalidPin;
      setError(errorMsg);
      onLogEvent?.('Verification failed', errorMsg, 'error');
    }
    setIsVerifying(false);
  };

  const handleResendCode = async () => {
    setError(null);
    setPinInput('');
    pinRef.current = '';
    await handleSendCode();
  };

  if (step === 'verified') {
    const phone = localStorage.getItem(VERIFIED_PHONE_KEY);
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>{t.phoneVerified}: {phone}</span>
      </div>
    );
  }

  if (step === 'phone') {
    return (
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
        {error && <p className="noddi-verification-error">{error}</p>}
      </div>
    );
  }

  // step === 'pin'
  return (
    <div className="noddi-ai-phone-prompt" style={{ margin: '8px 0' }}>
      <p className="noddi-ai-phone-label">{t.enterPin}</p>
      {codeSentMessage && <p className="noddi-verification-success">{t.codeSent}</p>}
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
      {error && <p className="noddi-verification-error">{error}</p>}
      <div className="noddi-verification-actions">
        <button className="noddi-ai-skip-phone" onClick={handleResendCode}>
          {t.resendCode}
        </button>
        <button className="noddi-ai-skip-phone" onClick={() => { setStep('phone'); setError(null); setPinInput(''); pinRef.current = ''; }}>
          {t.back}
        </button>
      </div>
    </div>
  );
};

// ========== New Interactive Block Components ==========

interface YesNoBlockProps {
  question: string;
  primaryColor: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onSelect: (choice: string, blockKey: string) => void;
}

const YesNoBlock: React.FC<YesNoBlockProps> = ({ question, primaryColor, messageId, blockIndex, usedBlocks, onSelect }) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selected = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  return (
    <div style={{ margin: '10px 0' }}>
      {question && <p style={{ fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>{question}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          disabled={isUsed}
          onClick={() => onSelect('Yes', blockKey)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #22c55e',
            background: selected === 'Yes' ? '#22c55e' : 'transparent',
            color: selected === 'Yes' ? '#fff' : '#22c55e',
            opacity: isUsed && selected !== 'Yes' ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M4 22H2V11h2"/></svg>
          Yes
        </button>
        <button
          disabled={isUsed}
          onClick={() => onSelect('No', blockKey)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #ef4444',
            background: selected === 'No' ? '#ef4444' : 'transparent',
            color: selected === 'No' ? '#fff' : '#ef4444',
            opacity: isUsed && selected !== 'No' ? 0.4 : 1,
            transition: 'all 0.15s ease',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15V19a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M20 2h2v11h-2"/></svg>
          No
        </button>
      </div>
    </div>
  );
};

interface EmailInputBlockProps {
  primaryColor: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onSubmit: (value: string, blockKey: string) => void;
}

const EmailInputBlock: React.FC<EmailInputBlockProps> = ({ primaryColor, messageId, blockIndex, usedBlocks, onSubmit }) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  if (submitted) {
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>{submitted}</span>
      </div>
    );
  }

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    onSubmit(trimmed, blockKey);
  };

  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
          <input
            type="email"
            placeholder="your@email.com"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            style={{ width: '100%', padding: '8px 10px 8px 32px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '13px', outline: 'none' }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: value.trim() ? 'pointer' : 'default', opacity: value.trim() ? 1 : 0.5 }}
        >→</button>
      </div>
      {error && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
};

interface TextInputBlockProps {
  placeholder: string;
  primaryColor: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onSubmit: (value: string, blockKey: string) => void;
}

const TextInputBlock: React.FC<TextInputBlockProps> = ({ placeholder, primaryColor, messageId, blockIndex, usedBlocks, onSubmit }) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const [value, setValue] = useState('');
  const submitted = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  if (submitted) {
    return (
      <div className="noddi-ai-verified-badge" style={{ margin: '8px 0' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
        <span style={{ fontSize: '12px' }}>{submitted}</span>
      </div>
    );
  }

  return (
    <div style={{ margin: '8px 0', display: 'flex', gap: '6px' }}>
      <input
        type="text"
        placeholder={placeholder || 'Type here...'}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onSubmit(value.trim(), blockKey); }}
        style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #d1d5db', fontSize: '13px', outline: 'none' }}
      />
      <button
        onClick={() => value.trim() && onSubmit(value.trim(), blockKey)}
        disabled={!value.trim()}
        style={{ backgroundColor: primaryColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: value.trim() ? 'pointer' : 'default', opacity: value.trim() ? 1 : 0.5 }}
      >→</button>
    </div>
  );
};

interface RatingBlockProps {
  primaryColor: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onSelect: (value: string, blockKey: string) => void;
}

const RatingBlock: React.FC<RatingBlockProps> = ({ primaryColor, messageId, blockIndex, usedBlocks, onSelect }) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selected = isUsed ? parseInt(localStorage.getItem(`noddi_action_${blockKey}`) || '0') : 0;
  const [hover, setHover] = useState(0);

  return (
    <div style={{ margin: '10px 0', display: 'flex', gap: '4px', alignItems: 'center' }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          disabled={isUsed}
          onMouseEnter={() => !isUsed && setHover(star)}
          onClick={() => onSelect(`Rating: ${star}/5`, blockKey)}
          style={{ background: 'none', border: 'none', cursor: isUsed ? 'default' : 'pointer', padding: '2px', transition: 'transform 0.1s', transform: (!isUsed && hover === star) ? 'scale(1.2)' : 'scale(1)' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill={(hover || selected) >= star ? '#facc15' : 'none'} stroke={(hover || selected) >= star ? '#facc15' : '#d1d5db'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
      {selected > 0 && <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>{selected}/5</span>}
    </div>
  );
};

interface ConfirmBlockProps {
  summary: string;
  primaryColor: string;
  messageId: string;
  blockIndex: number;
  usedBlocks: Set<string>;
  onSelect: (choice: string, blockKey: string) => void;
}

const ConfirmBlock: React.FC<ConfirmBlockProps> = ({ summary, primaryColor, messageId, blockIndex, usedBlocks, onSelect }) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const selected = isUsed ? localStorage.getItem(`noddi_action_${blockKey}`) : null;

  return (
    <div style={{ margin: '10px 0', border: '1.5px solid #e5e7eb', borderRadius: '12px', padding: '14px', background: '#fafafa' }}>
      <p style={{ fontSize: '13px', marginBottom: '12px', fontWeight: 500 }}>{summary}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          disabled={isUsed}
          onClick={() => onSelect('Confirmed', blockKey)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #22c55e',
            background: selected === 'Confirmed' ? '#22c55e' : 'transparent',
            color: selected === 'Confirmed' ? '#fff' : '#22c55e',
            opacity: isUsed && selected !== 'Confirmed' ? 0.4 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Confirm
        </button>
        <button
          disabled={isUsed}
          onClick={() => onSelect('Cancelled', blockKey)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: isUsed ? 'default' : 'pointer',
            border: '1.5px solid #ef4444',
            background: selected === 'Cancelled' ? '#ef4444' : 'transparent',
            color: selected === 'Cancelled' ? '#fff' : '#ef4444',
            opacity: isUsed && selected !== 'Cancelled' ? 0.4 : 1,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Cancel
        </button>
      </div>
    </div>
  );
};

// ========== Block Renderer ==========

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
  blocks,
  messageId,
  primaryColor,
  widgetKey,
  conversationId,
  language,
  usedBlocks,
  onActionSelect,
  onPhoneVerified,
  onLogEvent,
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
        if (block.type === 'action_menu') {
          return (
            <ActionMenuBlock
              key={idx}
              options={block.options}
              primaryColor={primaryColor}
              messageId={messageId}
              blockIndex={idx}
              usedBlocks={usedBlocks}
              onSelect={onActionSelect}
            />
          );
        }
        if (block.type === 'phone_verify') {
          return (
            <PhoneVerifyBlock
              key={idx}
              primaryColor={primaryColor}
              widgetKey={widgetKey}
              conversationId={conversationId}
              language={language}
              messageId={messageId}
              blockIndex={idx}
              usedBlocks={usedBlocks}
              onVerified={(phone) => onPhoneVerified(phone, `${messageId}:${idx}`)}
              onLogEvent={onLogEvent}
            />
          );
        }
        if (block.type === 'yes_no') {
          return (
            <YesNoBlock
              key={idx}
              question={block.question}
              primaryColor={primaryColor}
              messageId={messageId}
              blockIndex={idx}
              usedBlocks={usedBlocks}
              onSelect={(choice, bk) => {
                localStorage.setItem(`noddi_action_${bk}`, choice);
                onActionSelect(choice, bk);
              }}
            />
          );
        }
        if (block.type === 'email_input') {
          return (
            <EmailInputBlock
              key={idx}
              primaryColor={primaryColor}
              messageId={messageId}
              blockIndex={idx}
              usedBlocks={usedBlocks}
              onSubmit={(val, bk) => {
                localStorage.setItem(`noddi_action_${bk}`, val);
                onActionSelect(val, bk);
              }}
            />
          );
        }
        if (block.type === 'text_input') {
          return (
            <TextInputBlock
              key={idx}
              placeholder={block.placeholder}
              primaryColor={primaryColor}
              messageId={messageId}
              blockIndex={idx}
              usedBlocks={usedBlocks}
              onSubmit={(val, bk) => {
                localStorage.setItem(`noddi_action_${bk}`, val);
                onActionSelect(val, bk);
              }}
            />
          );
        }
        if (block.type === 'rating') {
          return (
            <RatingBlock
              key={idx}
              primaryColor={primaryColor}
              messageId={messageId}
              blockIndex={idx}
              usedBlocks={usedBlocks}
              onSelect={(val, bk) => {
                const num = val.match(/\d/)?.[0] || '0';
                localStorage.setItem(`noddi_action_${bk}`, num);
                onActionSelect(val, bk);
              }}
            />
          );
        }
        if (block.type === 'confirm') {
          return (
            <ConfirmBlock
              key={idx}
              summary={block.summary}
              primaryColor={primaryColor}
              messageId={messageId}
              blockIndex={idx}
              usedBlocks={usedBlocks}
              onSelect={(choice, bk) => {
                localStorage.setItem(`noddi_action_${bk}`, choice);
                onActionSelect(choice, bk);
              }}
            />
          );
        }
        return null;
      })}
    </>
  );
};

// ========== Main Component ==========

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
  onLogEvent,
}) => {
  const [messages, setMessages] = useState<AiChatMessage[]>(loadMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(() => localStorage.getItem(CONVERSATION_ID_KEY));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track used interactive blocks (action pills clicked, phone verified)
  const [usedBlocks, setUsedBlocks] = useState<Set<string>>(new Set());

  // Phone verification state (simplified — now driven by blocks)
  const [verifiedPhone, setVerifiedPhone] = useState(() => localStorage.getItem(VERIFIED_PHONE_KEY) || '');

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

  const isPhoneVerified = !!verifiedPhone;

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
    onLogEvent?.('User message', content.slice(0, 100), 'info');

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
        onLogEvent?.('AI stream fallback', 'Used non-streaming endpoint', 'info');
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
        onLogEvent?.('AI response', fullReply.slice(0, 100), 'success');
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
  }, [isLoading, messages, widgetKey, verifiedPhone, language, conversationId, t]);

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

  const handleActionSelect = useCallback((option: string, blockKey: string) => {
    localStorage.setItem(`noddi_action_${blockKey}`, option);
    setUsedBlocks((prev) => new Set(prev).add(blockKey));
    sendMessage(option);
  }, [sendMessage]);

  const handlePhoneVerified = useCallback((phone: string, blockKey: string) => {
    setVerifiedPhone(phone);
    setUsedBlocks((prev) => new Set(prev).add(blockKey));
    // Auto-send post-verification message
    setTimeout(() => {
      sendMessage('Jeg har verifisert telefonnummeret mitt. Hva kan du hjelpe meg med?', phone);
    }, 500);
  }, [sendMessage]);

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
    setUsedBlocks(new Set());
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
        {messages.map((message) => {
          const blocks = message.role === 'assistant'
            ? parseMessageBlocks(message.content)
            : [{ type: 'text' as const, content: message.content }];

          return (
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
              >
                <MessageBlockRenderer
                  blocks={blocks}
                  messageId={message.id}
                  primaryColor={primaryColor}
                  widgetKey={widgetKey}
                  conversationId={conversationId}
                  language={language}
                  usedBlocks={usedBlocks}
                  onActionSelect={handleActionSelect}
                  onPhoneVerified={handlePhoneVerified}
                  onLogEvent={onLogEvent}
                />
              </div>
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
          );
        })}

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
