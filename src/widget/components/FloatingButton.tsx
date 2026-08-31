import React from 'react';

interface FloatingButtonProps {
  isOpen: boolean;
  onClick: () => void;
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  /** Agent replies received while the panel was closed. */
  unreadCount?: number;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  isOpen,
  onClick,
  primaryColor,
  position,
  unreadCount = 0,
}) => {
  const positionStyles = position === 'bottom-right' 
    ? { right: '20px' } 
    : { left: '20px' };

  const showBadge = !isOpen && unreadCount > 0;

  return (
    <div className="noddi-widget-button-wrap" style={positionStyles}>
    <button
      onClick={onClick}
      className="noddi-widget-button"
      style={{ position: 'relative', backgroundColor: primaryColor }}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      )}
    </button>
      {showBadge && (
        <span className="noddi-widget-unread-badge" aria-label={`${unreadCount} unread messages`}>
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  );
};
