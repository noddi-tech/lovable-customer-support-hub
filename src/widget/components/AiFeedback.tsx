import React, { useState } from 'react';
import { getApiUrl } from '../api';

interface AiFeedbackProps {
  messageId: string;
  conversationId: string;
  widgetKey: string;
  primaryColor: string;
}

export const AiFeedback: React.FC<AiFeedbackProps> = ({
  messageId,
  conversationId,
  widgetKey,
  primaryColor,
}) => {
  const [rating, setRating] = useState<'positive' | 'negative' | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (newRating: 'positive' | 'negative') => {
    if (submitted) return;
    setRating(newRating);
    setSubmitted(true);

    try {
      const apiBase = getApiUrl();
      await fetch(`${apiBase}/widget-ai-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          widgetKey,
          messageId,
          conversationId,
          rating: newRating,
        }),
      });
    } catch {
      // Best effort - don't disrupt UX
    }
  };

  return (
    <div className="noddi-ai-feedback">
      <button
        className={`noddi-ai-feedback-btn ${rating === 'positive' ? 'active' : ''}`}
        onClick={() => handleFeedback('positive')}
        disabled={submitted}
        title="Helpful"
        style={rating === 'positive' ? { color: primaryColor } : {}}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={rating === 'positive' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      </button>
      <button
        className={`noddi-ai-feedback-btn ${rating === 'negative' ? 'active' : ''}`}
        onClick={() => handleFeedback('negative')}
        disabled={submitted}
        title="Not helpful"
        style={rating === 'negative' ? { color: '#ef4444' } : {}}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={rating === 'negative' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
        </svg>
      </button>
    </div>
  );
};
