import * as React from "react";

export function PaneTabProbe() {
  React.useEffect(() => {
    const tabLists = document.querySelectorAll('[data-testid="builder-left-tabs"], [data-testid="builder-right-tabs"]');
    tabLists.forEach((el) => {
      const insideScrollArea = el.closest('[data-radix-scroll-area-viewport], .ScrollAreaViewport, [data-radix-scroll-area]');
      if (insideScrollArea) {
        // eslint-disable-next-line no-console
        console.warn("TabList is inside a ScrollArea — must be moved out:", el);
      }
      const computed = getComputedStyle(el as HTMLElement);
      if (/(auto|scroll|clip)/.test(computed.overflowY)) {
        console.warn("TabList has vertical overflow:", computed.overflowY, el);
      }
    });
  }, []);
  return null;
}