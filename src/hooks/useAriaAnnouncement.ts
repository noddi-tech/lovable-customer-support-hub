import { useEffect, useRef } from 'react';

interface UseAriaAnnouncementOptions {
  politeness?: 'polite' | 'assertive';
  delay?: number;
}

export const useAriaAnnouncement = (options: UseAriaAnnouncementOptions = {}) => {
  const { politeness = 'polite', delay = 100 } = options;
  const regionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Create aria live region if it doesn't exist
    if (!regionRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', politeness);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      
      document.body.appendChild(liveRegion);
      regionRef.current = liveRegion;
    }

    return () => {
      if (regionRef.current) {
        document.body.removeChild(regionRef.current);
        regionRef.current = null;
      }
    };
  }, [politeness]);

  const announce = (message: string) => {
    if (!regionRef.current) return;

    // Clear previous message
    regionRef.current.textContent = '';

    // Add new message with slight delay to ensure screen readers pick it up
    setTimeout(() => {
      if (regionRef.current) {
        regionRef.current.textContent = message;
      }
    }, delay);
  };

  return { announce };
};