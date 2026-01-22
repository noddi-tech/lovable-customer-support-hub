import React, { useState, useCallback } from 'react';
import type { WidgetConfig, WidgetView, ChatSession } from '../types';
import { ContactForm } from './ContactForm';
import { KnowledgeSearch } from './KnowledgeSearch';
import { LiveChat } from './LiveChat';
import { startChat } from '../api';
import { getWidgetTranslations, getLocalizedGreeting, getLocalizedResponseTime, SUPPORTED_WIDGET_LANGUAGES } from '../translations';

interface WidgetPanelProps {
  config: WidgetConfig;
  onClose: () => void;
}

// Generate a unique visitor ID
function getVisitorId(): string {
  let visitorId = localStorage.getItem('noddi_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('noddi_visitor_id', visitorId);
  }
  return visitorId;
}

// Get customer's preferred language from localStorage, or fallback to config
function getCustomerLanguage(configLanguage: string): string {
  const savedLanguage = localStorage.getItem('noddi_widget_language');
  if (savedLanguage && SUPPORTED_WIDGET_LANGUAGES.some(l => l.code === savedLanguage)) {
    return savedLanguage;
  }
  return configLanguage || 'no';
}

export const WidgetPanel: React.FC<WidgetPanelProps> = ({ config, onClose }) => {
  const [view, setView] = useState<WidgetView>('home');
  const [showSuccess, setShowSuccess] = useState(false);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(() => getCustomerLanguage(config.language));

  const t = getWidgetTranslations(currentLanguage);

  const handleLanguageChange = (langCode: string) => {
    setCurrentLanguage(langCode);
    localStorage.setItem('noddi_widget_language', langCode);
    setShowLanguageMenu(false);
  };

  const handleContactSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setView('home');
    }, 3000);
  };

  const handleStartChat = useCallback(async () => {
    setIsStartingChat(true);
    setChatError(null);

    const session = await startChat({
      widgetKey: config.widgetKey,
      visitorId: getVisitorId(),
      pageUrl: window.location.href,
    });

    if (session) {
      setChatSession(session);
      setView('chat');
    } else {
      setChatError('Unable to start chat. Please try again.');
    }

    setIsStartingChat(false);
  }, [config.widgetKey]);

  const handleEndChat = () => {
    setChatSession(null);
    setView('home');
  };

  const handleBackFromChat = () => {
    // If chat hasn't started or ended, just go back
    if (!chatSession || chatSession.status === 'ended') {
      setChatSession(null);
    }
    setView('home');
  };

  const positionStyles = config.position === 'bottom-right' 
    ? { right: '20px' } 
    : { left: '20px' };

  const currentLang = SUPPORTED_WIDGET_LANGUAGES.find(l => l.code === currentLanguage);
  const currentLangName = currentLang?.name || 'English';
  const currentLangFlag = currentLang?.flag || '🌐';

  // Get localized greeting and response time with per-language overrides
  const localizedGreeting = getLocalizedGreeting(
    config.greetingText,
    currentLanguage,
    config.greetingTranslations
  );
  const localizedResponseTime = getLocalizedResponseTime(
    config.responseTimeText,
    currentLanguage,
    config.responseTimeTranslations
  );

  return (
    <div className="noddi-widget-panel" style={positionStyles}>
      {/* Header */}
      <div 
        className="noddi-widget-header"
        style={{ backgroundColor: config.primaryColor }}
      >
        <div className="noddi-widget-header-content">
          {config.logoUrl && (
            <img src={config.logoUrl} alt="" className="noddi-widget-logo" />
          )}
          <div>
            <h3 className="noddi-widget-title">
              {config.companyName || 'Chat with us'}
            </h3>
            <p className="noddi-widget-subtitle">{localizedResponseTime}</p>
          </div>
        </div>
        <button onClick={onClose} className="noddi-widget-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="noddi-widget-content">
        {showSuccess ? (
          <div className="noddi-widget-success">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: config.primaryColor }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h4>{t.messageSent}</h4>
            <p>{t.wellGetBack}</p>
          </div>
        ) : view === 'home' ? (
          <div className="noddi-widget-home">
            <p className="noddi-widget-greeting">{localizedGreeting}</p>
            
            {chatError && (
              <div className="noddi-widget-error">
                {chatError}
              </div>
            )}
            
          <div className="noddi-widget-actions">
              {/* Show live chat only when agents are online */}
              {config.enableChat && config.agentsOnline && (
                <button
                  className="noddi-widget-action noddi-widget-action-primary"
                  onClick={handleStartChat}
                  disabled={isStartingChat}
                  style={{ borderColor: config.primaryColor }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <span>{isStartingChat ? t.startingChat : t.startLiveChat}</span>
                  <span className="noddi-widget-online-badge">● {t.online}</span>
                </button>
              )}

              {/* Show offline notice when chat is enabled but no agents online */}
              {config.enableChat && !config.agentsOnline && (
                <div className="noddi-widget-offline-notice">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  <div className="noddi-widget-offline-text">
                    <span className="noddi-widget-offline-title">{t.offline}</span>
                    <span className="noddi-widget-offline-subtitle">{t.leaveMessage}</span>
                  </div>
                </div>
              )}

              {config.enableContactForm && (
                <button
                  className="noddi-widget-action"
                  onClick={() => setView('contact')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>{config.enableChat && !config.agentsOnline ? t.leaveMessage : t.sendMessage}</span>
                </button>
              )}
              
              {config.enableKnowledgeSearch && (
                <button
                  className="noddi-widget-action"
                  onClick={() => setView('search')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span>{t.searchAnswers}</span>
                </button>
              )}
            </div>
          </div>
        ) : view === 'contact' ? (
          <div className="noddi-widget-view">
            <button 
              className="noddi-widget-back" 
              onClick={() => setView('home')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              {t.back}
            </button>
            <ContactForm
              widgetKey={config.widgetKey}
              primaryColor={config.primaryColor}
              onSuccess={handleContactSuccess}
              language={currentLanguage}
            />
          </div>
        ) : view === 'search' ? (
          <div className="noddi-widget-view">
            <button 
              className="noddi-widget-back" 
              onClick={() => setView('home')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              {t.back}
            </button>
            <KnowledgeSearch
              widgetKey={config.widgetKey}
              primaryColor={config.primaryColor}
              language={currentLanguage}
            />
          </div>
        ) : view === 'chat' && chatSession ? (
          <LiveChat
            session={chatSession}
            primaryColor={config.primaryColor}
            onEnd={handleEndChat}
            onBack={handleBackFromChat}
            language={currentLanguage}
          />
        ) : null}
      </div>

      {/* Footer with language selector */}
      <div className="noddi-widget-footer">
        <div className="noddi-widget-footer-content">
          <span>{t.poweredBy}</span>
          <div className="noddi-widget-language-selector">
            <button 
              className="noddi-widget-language-btn"
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              aria-label={t.changeLanguage}
            >
              <span className="noddi-widget-flag">{currentLangFlag}</span>
              <span>{currentLangName}</span>
            </button>
            
            {showLanguageMenu && (
              <div className="noddi-widget-language-menu">
                {SUPPORTED_WIDGET_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    className={`noddi-widget-language-option ${currentLanguage === lang.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                  >
                    <span className="noddi-widget-flag">{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
