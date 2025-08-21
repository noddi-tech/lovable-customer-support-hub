import React, { useEffect, useRef } from 'react';
import { X, Menu } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface MobileDrawerSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  side?: 'left' | 'right';
}

export const MobileDrawerSidebar: React.FC<MobileDrawerSidebarProps> = ({
  isOpen,
  onClose,
  onToggle,
  children,
  title,
  className,
  side = 'right'
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Handle escape key and focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
      
      // Focus the drawer
      drawerRef.current?.focus();
      
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
        
        // Restore focus to the previously focused element
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Swipe gesture handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].screenX;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 50;
    const swipeDistance = touchStartX.current - touchEndX.current;
    
    if (side === 'right' && swipeDistance > swipeThreshold) {
      onClose();
    } else if (side === 'left' && swipeDistance < -swipeThreshold) {
      onClose();
    }
  };

  return (
    <>
      {/* Toggle Button - Always visible */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="md:hidden fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border"
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Drawer Overlay and Content */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 md:hidden"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 animate-fade-in" />
          
          {/* Drawer */}
          <div
            ref={drawerRef}
            className={cn(
              "absolute top-0 h-full w-80 max-w-[85vw] bg-background border shadow-lg",
              "animate-slide-in-right",
              side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
              className
            )}
            tabIndex={-1}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{title}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Content */}
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
};