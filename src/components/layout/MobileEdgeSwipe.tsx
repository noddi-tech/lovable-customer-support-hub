import { useEffect } from 'react';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Enables an iOS/Android-style edge swipe to open the navigation sidebar on
 * touch devices: start a horizontal drag within 24px of the left screen edge
 * and pull right. Swiping left while the drawer is open closes it.
 */
export const MobileEdgeSwipe = () => {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (!isMobile) return;

    const EDGE = 24;
    const THRESHOLD = 60;
    let startX = 0;
    let startY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = openMobile ? true : startX <= EDGE;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dy) > Math.abs(dx)) {
        tracking = false;
        return;
      }
      if (!openMobile && dx > THRESHOLD) {
        tracking = false;
        setOpenMobile(true);
      } else if (openMobile && dx < -THRESHOLD) {
        tracking = false;
        setOpenMobile(false);
      }
    };

    const onTouchEnd = () => {
      tracking = false;
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, openMobile, setOpenMobile]);

  return null;
};
