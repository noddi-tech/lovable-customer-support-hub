import React, { useState } from 'react';
import { rateChat, emailChatTranscript, getIdentity } from '../api';
import { getWidgetTranslations } from '../translations';

interface ChatRatingProps {
  sessionId: string;
  primaryColor: string;
  language: string;
  onDone: () => void;
}

/** Post-chat CSAT + "email me the transcript" step shown when a chat ends. */
export const ChatRating: React.FC<ChatRatingProps> = ({ sessionId, primaryColor, language, onDone }) => {
  const t = getWidgetTranslations(language);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState(getIdentity().email || '');
  const [transcriptSent, setTranscriptSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submitRating = async (value: number, withComment = false) => {
    setRating(value);
    if (!withComment) return;
    setBusy(true);
    await rateChat(sessionId, value, comment.trim() || undefined);
    setBusy(false);
    setSubmitted(true);
  };

  const sendTranscript = async () => {
    if (!email.trim()) return;
    setBusy(true);
    const ok = await emailChatTranscript(sessionId, email.trim());
    setBusy(false);
    if (ok) setTranscriptSent(true);
  };

  return (
    <div className="noddi-chat-rating">
      {!submitted ? (
        <>
          <p className="noddi-chat-rating-title">{t.rateTitle}</p>
          <div className="noddi-chat-rating-stars">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                className={`noddi-chat-rating-star ${rating && value <= rating ? 'active' : ''}`}
                onClick={() => submitRating(value)}
                aria-label={`${value}`}
              >
                ★
              </button>
            ))}
          </div>
          {rating !== null && (
            <>
              <textarea
                className="noddi-chat-rating-comment"
                placeholder={t.rateCommentPlaceholder}
                value={comment}
                maxLength={500}
                onChange={(e) => setComment(e.target.value)}
              />
              <button
                className="noddi-chat-new-button"
                style={{ backgroundColor: primaryColor }}
                disabled={busy}
                onClick={() => submitRating(rating, true)}
              >
                {t.rateSubmit}
              </button>
            </>
          )}
        </>
      ) : (
        <p className="noddi-chat-rating-title">{t.rateThanks}</p>
      )}

      <div className="noddi-chat-transcript">
        {transcriptSent ? (
          <p className="noddi-chat-rating-note">{t.transcriptSent}</p>
        ) : (
          <>
            <label className="noddi-chat-rating-note" htmlFor="noddi-transcript-email">
              {t.transcriptLabel}
            </label>
            <div className="noddi-chat-transcript-row">
              <input
                id="noddi-transcript-email"
                type="email"
                className="noddi-chat-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                className="noddi-chat-send"
                style={{ backgroundColor: primaryColor }}
                disabled={busy || !email.trim()}
                onClick={sendTranscript}
                aria-label={t.transcriptSend}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      <button className="noddi-widget-back" onClick={onDone}>
        {t.startNewConversation}
      </button>
    </div>
  );
};
