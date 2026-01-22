import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWidgetPolling } from '../hooks/useWidgetPolling';
import { sendChatMessage, updateTypingStatus, endChat } from '../api';
import { getWidgetTranslations } from '../translations';
import type { ChatSession } from '../types';

interface LiveChatProps {
  session: ChatSession;
  primaryColor: string;
  visitorName?: string;
  onEnd: () => void;
  onBack: () => void;
  language: string;
}

export const LiveChat: React.FC<LiveChatProps> = ({
  session,
  primaryColor,
  visitorName,
  onEnd,
  onBack,
  language,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingRef = useRef(false);

  const t = getWidgetTranslations(language);

  const {
    messages,
    agentTyping,
    sessionStatus,
    assignedAgentName,
    isConnected,
    refetch,
  } = useWidgetPolling(session.id);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, agentTyping]);

  // Handle typing indicator
  const handleTyping = useCallback((isTyping: boolean) => {
    if (isTyping !== lastTypingRef.current) {
      lastTypingRef.current = isTyping;
      updateTypingStatus(session.id, isTyping);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to clear typing after 3 seconds of no activity
    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        lastTypingRef.current = false;
        updateTypingStatus(session.id, false);
      }, 3000);
    }
  }, [session.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.length > 0) {
      handleTyping(true);
    }
  };

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setInputValue('');
    handleTyping(false);

    const result = await sendChatMessage(session.id, content);
    
    if (result) {
      // Immediately refetch to show the new message
      refetch();
    }

    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndChat = async () => {
    await endChat(session.id);
    onEnd();
  };

  const isEnded = sessionStatus === 'ended' || sessionStatus === 'abandoned';

  return (
    <div className="noddi-widget-chat">
      {/* Back button */}
      <button className="noddi-widget-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        {t.back}
      </button>

      {/* Status bar */}
      <div className="noddi-chat-status">
        <div className="noddi-chat-status-indicator">
          <span 
            className="noddi-chat-status-dot" 
            style={{ 
              backgroundColor: isConnected 
                ? (sessionStatus === 'active' ? '#22c55e' : '#f59e0b') 
                : '#ef4444' 
            }}
          />
          <span className="noddi-chat-status-text">
            {isEnded 
              ? t.chatEnded
              : sessionStatus === 'waiting' 
                ? t.waitingForAgent
                : assignedAgentName 
                  ? `${t.chattingWith} ${assignedAgentName}`
                  : t.connected}
          </span>
        </div>
        {!isEnded && (
          <button 
            className="noddi-chat-end-button"
            onClick={handleEndChat}
          >
            {t.endChat}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="noddi-chat-messages">
        {messages.length === 0 && !isEnded && (
          <div className="noddi-chat-empty">
            <p>{t.startConversation}</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`noddi-chat-message ${message.senderType === 'customer' ? 'noddi-chat-message-customer' : 'noddi-chat-message-agent'}`}
          >
            {message.senderType === 'agent' && message.senderName && (
              <span className="noddi-chat-message-sender">{message.senderName}</span>
            )}
            <div 
              className="noddi-chat-message-bubble"
              style={message.senderType === 'customer' ? { backgroundColor: primaryColor } : {}}
            >
              {message.content}
            </div>
            <span className="noddi-chat-message-time">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}

        {agentTyping && (
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

      {/* Input */}
      {!isEnded && (
        <div className="noddi-chat-input-container">
          <input
            type="text"
            className="noddi-chat-input"
            placeholder={t.typeMessage}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
          />
          <button
            className="noddi-chat-send"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            style={{ backgroundColor: primaryColor }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      )}

      {isEnded && (
        <div className="noddi-chat-ended">
          <p>{t.thankYou}</p>
          <button
            className="noddi-chat-new-button"
            onClick={onBack}
            style={{ backgroundColor: primaryColor }}
          >
            {t.startNewConversation}
          </button>
        </div>
      )}
    </div>
  );
};
