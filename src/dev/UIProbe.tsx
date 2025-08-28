import { useEffect } from 'react';

interface OverlapInfo {
  element: Element;
  page: string;
  domPath: string;
  cause: string;
  styles: Record<string, string>;
  rect: DOMRect;
  parentRect: DOMRect;
}

/**
 * UIProbe: Runtime diagnostics for tab/button overlap detection
 * Only active when VITE_UI_PROBE=1
 */
export function UIProbe() {
  useEffect(() => {
    if (import.meta.env.VITE_UI_PROBE !== '1') return;

    const probeElements = () => {
      const offenders: OverlapInfo[] = [];
      
      // Target likely overlap candidates
      const candidates = document.querySelectorAll(`
        [role="tab"],
        [data-radix-tabs-trigger],
        .control-tab,
        .control-toolbar button,
        [class*="TabsList"] [role="tab"],
        [class*="toolbar"] button,
        [class*="button-group"] button
      `);

      candidates.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const parent = element.parentElement;
        if (!parent) return;

        const parentRect = parent.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        const parentStyle = window.getComputedStyle(parent);

        // Check for overflow causes
        const causes: string[] = [];
        
        // 1. whitespace-nowrap in narrow container
        if (computedStyle.whiteSpace === 'nowrap' && rect.width > parentRect.width) {
          causes.push('whitespace-nowrap causing horizontal overflow');
        }

        // 2. Parent lacks flex-wrap
        if (parentStyle.display.includes('flex') && parentStyle.flexWrap === 'nowrap' && 
            rect.right > parentRect.right) {
          causes.push('parent flex container lacks flex-wrap');
        }

        // 3. Negative margins
        const marginBottom = parseFloat(computedStyle.marginBottom);
        const marginTop = parseFloat(computedStyle.marginTop);
        if (marginBottom < 0 || marginTop < 0) {
          causes.push(`negative margins: mt=${marginTop}px mb=${marginBottom}px`);
        }

        // 4. Fixed height with large padding
        const height = parseFloat(computedStyle.height);
        const paddingY = parseFloat(computedStyle.paddingTop) + parseFloat(computedStyle.paddingBottom);
        if (height > 0 && paddingY > height * 0.5) {
          causes.push(`fixed height ${height}px with large padding ${paddingY}px`);
        }

        // 5. Overflow hidden on growing content
        if (parentStyle.overflow === 'hidden' && rect.width > parentRect.width) {
          causes.push('parent has overflow-hidden with overflowing content');
        }

        // 6. Check for overlap with next sibling
        const nextSibling = element.nextElementSibling;
        if (nextSibling) {
          const siblingRect = nextSibling.getBoundingClientRect();
          if (rect.bottom > siblingRect.top + 1) {
            causes.push(`overlaps next sibling by ${Math.round(rect.bottom - siblingRect.top)}px`);
          }
        }

        if (causes.length > 0) {
          // Add visual indicator
          element.setAttribute('data-ui-probe', 'overflow');
          element.setAttribute('style', `${element.getAttribute('style') || ''} outline: 2px solid #ef4444 !important; outline-offset: 2px !important;`);

          offenders.push({
            element,
            page: window.location.pathname,
            domPath: getDOMPath(element),
            cause: causes.join('; '),
            styles: {
              display: computedStyle.display,
              whiteSpace: computedStyle.whiteSpace,
              flexWrap: parentStyle.flexWrap,
              minWidth: computedStyle.minWidth,
              overflow: parentStyle.overflow,
              position: computedStyle.position,
              height: computedStyle.height,
              padding: `${computedStyle.paddingTop} ${computedStyle.paddingRight} ${computedStyle.paddingBottom} ${computedStyle.paddingLeft}`,
              margin: `${computedStyle.marginTop} ${computedStyle.marginRight} ${computedStyle.marginBottom} ${computedStyle.marginLeft}`,
            },
            rect,
            parentRect
          });
        }
      });

      if (offenders.length > 0) {
        console.groupCollapsed(`🚨 UIProbe: Found ${offenders.length} overlap issues on ${window.location.pathname}`);
        offenders.forEach((offender, i) => {
          console.groupCollapsed(`${i + 1}. ${offender.cause}`);
          console.log('Element:', offender.element);
          console.log('DOM Path:', offender.domPath);
          console.log('Computed Styles:', offender.styles);
          console.log('Element Rect:', {
            width: Math.round(offender.rect.width),
            height: Math.round(offender.rect.height),
            x: Math.round(offender.rect.x),
            y: Math.round(offender.rect.y)
          });
          console.log('Parent Rect:', {
            width: Math.round(offender.parentRect.width),
            height: Math.round(offender.parentRect.height),
            x: Math.round(offender.parentRect.x),
            y: Math.round(offender.parentRect.y)
          });
          console.groupEnd();
        });
        console.groupEnd();
      } else {
        console.log('✅ UIProbe: No overlap issues detected on', window.location.pathname);
      }
    };

    // Run probe after layout stabilizes
    const timeoutId = setTimeout(probeElements, 1000);
    
    // Re-run on resize
    const handleResize = () => {
      // Clear previous indicators
      document.querySelectorAll('[data-ui-probe="overflow"]').forEach(el => {
        el.removeAttribute('data-ui-probe');
        el.removeAttribute('style');
      });
      setTimeout(probeElements, 100);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      // Cleanup indicators
      document.querySelectorAll('[data-ui-probe="overflow"]').forEach(el => {
        el.removeAttribute('data-ui-probe');
        el.removeAttribute('style');
      });
    };
  }, []);

  return null;
}

function getDOMPath(element: Element): string {
  const path: string[] = [];
  let current: Element | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className) {
      const classes = current.className.toString().split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        selector += `.${classes.slice(0, 2).join('.')}`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}