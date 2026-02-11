import React, { useState, useEffect, useRef } from 'react';
import { registerBlock, BlockComponentProps, FlowPreviewProps } from './registry';
import { sendPhoneVerification, verifyPhonePin } from '../../api';
import { getWidgetTranslations } from '../../translations';

const VERIFIED_PHONE_KEY = 'noddi_ai_verified_phone';

const PhoneVerifyBlock: React.FC<BlockComponentProps> = ({
  primaryColor, widgetKey, conversationId, language, messageId, blockIndex, usedBlocks, onAction, onLogEvent,
}) => {
  const blockKey = `${messageId}:${blockIndex}`;
  const isUsed = usedBlocks.has(blockKey);
  const t = getWidgetTranslations(language || 'no');

  const [step, setStep] = useState<'phone' | 'pin' | 'verified'>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const pinRef = useRef('');
  const [error, setError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSentMessage, setCodeSentMessage] = useState(false);

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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          <span>{t.phoneVerified}: {phone}</span>
        </div>
      );
    }
    return null;
  }

  const handleSendCode = async () => {
    const phone = phoneInput.trim();
    if (!phone || isSendingCode || !widgetKey) return;
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
    if (!pin || isVerifying || !widgetKey) return;
    setIsVerifying(true);
    setError(null);

    const result = await verifyPhonePin(widgetKey, phoneInput.trim(), pin, conversationId || undefined);
    if (result.verified) {
      const phone = phoneInput.trim();
      setStep('verified');
      localStorage.setItem(VERIFIED_PHONE_KEY, phone);
      localStorage.setItem('noddi_ai_phone', phone);
      onLogEvent?.('Phone verified', phone, 'success');
      onAction(phone, blockKey);
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
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
            <input type="tel" className="noddi-phone-input" placeholder="XXX XX XXX" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSendCode(); }} />
          </div>
          <button className="noddi-ai-phone-submit" onClick={handleSendCode} style={{ backgroundColor: primaryColor }} disabled={!phoneInput.trim() || isSendingCode}>
            {isSendingCode ? (
              <svg className="noddi-widget-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
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
              <input key={i} type="text" inputMode="numeric" className="noddi-otp-slot" maxLength={1} value={pinInput[i] || ''} autoFocus={i === 0}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (!val) return;
                  const newPin = pinRef.current.split('');
                  newPin[i] = val[0];
                  const joined = newPin.join('').slice(0, 6);
                  pinRef.current = joined;
                  setPinInput(joined);
                  const next = e.target.nextElementSibling as HTMLInputElement || e.target.parentElement?.nextElementSibling?.nextElementSibling?.querySelector('input') as HTMLInputElement;
                  if (next && val) next.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !pinInput[i]) {
                    const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement || ((e.target as HTMLElement).parentElement?.previousElementSibling?.previousElementSibling?.querySelector('input:last-child') as HTMLInputElement);
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
              <input key={i} type="text" inputMode="numeric" className="noddi-otp-slot" maxLength={1} value={pinInput[i] || ''}
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
                    const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement || ((e.target as HTMLElement).parentElement?.previousElementSibling?.previousElementSibling?.querySelector('input:last-child') as HTMLInputElement);
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
        <button className="noddi-ai-phone-submit" onClick={() => handleVerifyPin()} style={{ backgroundColor: primaryColor }} disabled={pinInput.length < 4 || isVerifying}>
          {isVerifying ? (
            <svg className="noddi-widget-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          ) : '✓'}
        </button>
      </div>
      {error && <p className="noddi-verification-error">{error}</p>}
      <div className="noddi-verification-actions">
        <button className="noddi-ai-skip-phone" onClick={handleResendCode}>{t.resendCode}</button>
        <button className="noddi-ai-skip-phone" onClick={() => { setStep('phone'); setError(null); setPinInput(''); pinRef.current = ''; }}>{t.back}</button>
      </div>
    </div>
  );
};

const PhoneVerifyPreview: React.FC<FlowPreviewProps> = () => (
  <div className="rounded-md bg-white dark:bg-background border p-2 space-y-1.5">
    <p className="text-[9px] text-muted-foreground font-medium">Customer sees:</p>
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0 border rounded-md px-2 py-1 text-[10px] bg-muted/30 flex-1">
        <span className="text-muted-foreground font-medium mr-1">+47</span>
        <span className="text-muted-foreground/50">XXX XX XXX</span>
      </div>
      <div className="h-6 w-6 rounded-md bg-purple-500 flex items-center justify-center text-white text-[10px] font-bold">→</div>
    </div>
    <div className="flex items-center gap-1 justify-center">
      {[1,2,3].map(i => <div key={i} className="h-5 w-4 rounded border bg-muted/30 flex items-center justify-center text-[8px] text-muted-foreground">•</div>)}
      <span className="text-[8px] text-muted-foreground mx-0.5">·</span>
      {[4,5,6].map(i => <div key={i} className="h-5 w-4 rounded border bg-muted/30 flex items-center justify-center text-[8px] text-muted-foreground">•</div>)}
    </div>
  </div>
);

registerBlock({
  type: 'phone_verify',
  marker: '[PHONE_VERIFY]',
  parseContent: () => ({}),
  component: PhoneVerifyBlock,
  requiresApi: true,
  apiConfig: {
    endpoints: [
      {
        name: 'Send Verification Code',
        edgeFunction: 'widget-send-verification',
        externalApi: 'GET /v1/users/send-phone-number-verification/',
        method: 'GET',
        requestBody: { widgetKey: 'string', phoneNumber: 'string', domain: 'string' },
        responseShape: { success: 'boolean' },
        description: 'Sends an SMS with a 6-digit PIN to the provided phone number via the Noddi API.',
      },
      {
        name: 'Verify PIN',
        edgeFunction: 'widget-verify-phone',
        externalApi: 'POST /v1/users/verify-phone-number/',
        method: 'POST',
        requestBody: { widgetKey: 'string', phoneNumber: 'string', pin: 'string', conversationId: 'string' },
        responseShape: { verified: 'boolean', token: 'string?', attemptsRemaining: 'number?' },
        description: 'Verifies the PIN code entered by the customer against the Noddi API.',
      },
    ],
  },
  flowMeta: {
    label: 'Phone + PIN Verification',
    icon: '📱',
    description: 'The customer will see a phone number input. After entering their number, they\'ll receive an SMS with a 6-digit PIN code to verify their identity.',
    applicableFieldTypes: ['phone'],
    previewComponent: PhoneVerifyPreview,
  },
});

export default PhoneVerifyBlock;
