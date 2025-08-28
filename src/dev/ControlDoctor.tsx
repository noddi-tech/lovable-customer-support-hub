import React, { useEffect } from 'react';

interface OverlapViolation {
  file: string;
  role: string;
  className: string;
  id: string;
  element: HTMLElement;
}

/**
 * ControlDoctor: Development utility to detect overlapping tabs and buttons
 * Only runs when VITE_UI_DOCTOR=1
 */
export function ControlDoctor() {
  useEffect(() => {
    if (import.meta.env.VITE_UI_DOCTOR !== '1') {
      return;
    }

    const checkOverlaps = () => {
      const violations: OverlapViolation[] = [];
      
      // Query for tabs, buttons, and related controls
      const selectors = [
        'button',
        '[role="tab"]', 
        '[data-state]',
        '[data-radix-tabs] button',
        '.tabs-list button',
        '[data-testid*="tab"]'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;
        
        elements.forEach(element => {
          const parent = element.parentElement;
          if (!parent) return;

          const elementRect = element.getBoundingClientRect();
          const parentRect = parent.getBoundingClientRect();
          
          // Check if element overflows parent or is clipped
          const isOverflowing = 
            elementRect.right > parentRect.right + 1 || // Allow 1px tolerance
            elementRect.bottom > parentRect.bottom + 1 ||
            elementRect.left < parentRect.left - 1 ||
            elementRect.top < parentRect.top - 1;

          // Check for negative margins that could cause overlap
          const computedStyle = window.getComputedStyle(element);
          const hasNegativeMargin = 
            computedStyle.marginTop.includes('-') ||
            computedStyle.marginBottom.includes('-') ||
            computedStyle.marginLeft.includes('-') ||
            computedStyle.marginRight.includes('-');

          if (isOverflowing || hasNegativeMargin) {
            violations.push({
              file: window.location.pathname || 'unknown',
              role: element.getAttribute('role') || element.tagName.toLowerCase(),
              className: element.className || 'no-class',
              id: element.id || 'no-id',
              element
            });
          }
        });
      });

      if (violations.length > 0) {
        console.warn('🔍 ControlDoctor found overlapping elements:');
        violations.forEach(violation => {
          console.warn({
            file: violation.file,
            role: violation.role,
            className: violation.className,
            id: violation.id,
            element: violation.element
          });
        });
      } else {
        console.log('✅ ControlDoctor: No overlapping elements found');
      }
    };

    // Check on mount and when window resizes
    checkOverlaps();
    
    const handleResize = () => {
      setTimeout(checkOverlaps, 100); // Debounce resize checks
    };

    window.addEventListener('resize', handleResize);
    
    // Also check when DOM changes (new tabs, etc.)
    const observer = new MutationObserver(() => {
      setTimeout(checkOverlaps, 50);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, []);

  // This component renders nothing
  return null;
}