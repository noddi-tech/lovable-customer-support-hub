import React, { useState } from 'react';
import type { WidgetConfig, WidgetView } from '../types';
import { ContactForm } from './ContactForm';
import { KnowledgeSearch } from './KnowledgeSearch';

interface WidgetPanelProps {
  config: WidgetConfig;
  onClose: () => void;
}

export const WidgetPanel: React.FC<WidgetPanelProps> = ({ config, onClose }) => {
  const [view, setView] = useState<WidgetView>('home');
  const [showSuccess, setShowSuccess] = useState(false);

  const handleContactSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setView('home');
    }, 3000);
  };

  const positionStyles = config.position === 'bottom-right' 
    ? { right: '20px' } 
    : { left: '20px' };

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
            <p className="noddi-widget-subtitle">{config.responseTimeText}</p>
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
            <h4>Message sent!</h4>
            <p>We'll get back to you as soon as possible.</p>
          </div>
        ) : view === 'home' ? (
          <div className="noddi-widget-home">
            <p className="noddi-widget-greeting">{config.greetingText}</p>
            
            <div className="noddi-widget-actions">
              {config.enableContactForm && (
                <button
                  className="noddi-widget-action"
                  onClick={() => setView('contact')}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>Send us a message</span>
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
                  <span>Search answers</span>
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
              Back
            </button>
            <ContactForm
              widgetKey={config.widgetKey}
              primaryColor={config.primaryColor}
              onSuccess={handleContactSuccess}
            />
          </div>
        ) : (
          <div className="noddi-widget-view">
            <button 
              className="noddi-widget-back" 
              onClick={() => setView('home')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back
            </button>
            <KnowledgeSearch
              widgetKey={config.widgetKey}
              primaryColor={config.primaryColor}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="noddi-widget-footer">
        <span>Powered by Noddi</span>
      </div>
    </div>
  );
};
