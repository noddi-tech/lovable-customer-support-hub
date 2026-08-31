import React, { useState } from 'react';
import { getIdentity, setIdentity } from '../api';
import { getWidgetTranslations } from '../translations';

interface PreChatFormProps {
  primaryColor: string;
  language: string;
  isStarting: boolean;
  error?: string | null;
  onSubmit: (visitor: { name: string; email: string; message?: string }) => void;
  onBack: () => void;
}

/**
 * Shown before a live chat starts when the host app has not identified the
 * visitor. Captures the minimum agents need to follow up by email if the
 * visitor disappears mid-chat.
 */
export const PreChatForm: React.FC<PreChatFormProps> = ({
  primaryColor,
  language,
  isStarting,
  error,
  onSubmit,
  onBack,
}) => {
  const t = getWidgetTranslations(language);
  const identity = getIdentity();
  const [name, setName] = useState(identity.name || '');
  const [email, setEmail] = useState(identity.email || '');
  const [message, setMessage] = useState('');

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = name.trim().length > 1 && emailValid && !isStarting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    // Remember the visitor so later sessions skip this form.
    setIdentity({ name: name.trim(), email: email.trim() });
    onSubmit({ name: name.trim(), email: email.trim(), message: message.trim() || undefined });
  };

  return (
    <div className="noddi-widget-view">
      <button className="noddi-widget-back" onClick={onBack} type="button">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {t.back}
      </button>

      <form className="noddi-widget-form" onSubmit={handleSubmit}>
        <p className="noddi-widget-greeting">{t.preChatIntro}</p>

        <label className="noddi-widget-label" htmlFor="noddi-prechat-name">{t.name}</label>
        <input
          id="noddi-prechat-name"
          className="noddi-widget-input"
          value={name}
          maxLength={120}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label className="noddi-widget-label" htmlFor="noddi-prechat-email">{t.email}</label>
        <input
          id="noddi-prechat-email"
          type="email"
          className="noddi-widget-input"
          value={email}
          maxLength={160}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="noddi-widget-label" htmlFor="noddi-prechat-message">{t.preChatTopic}</label>
        <textarea
          id="noddi-prechat-message"
          className="noddi-widget-textarea"
          value={message}
          maxLength={1000}
          rows={3}
          onChange={(e) => setMessage(e.target.value)}
        />

        {error && <div className="noddi-widget-error">{error}</div>}

        <button
          type="submit"
          className="noddi-widget-submit"
          style={{ backgroundColor: primaryColor }}
          disabled={!canSubmit}
        >
          {isStarting ? t.startingChat : t.startLiveChat}
        </button>
      </form>
    </div>
  );
};
