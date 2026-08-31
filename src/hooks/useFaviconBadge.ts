import { useEffect, useRef } from 'react';

const BADGE_ID = 'favicon-badge';

function getBaseFaviconHref(): string {
  const links = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  ).filter((l) => l.id !== BADGE_ID);
  return links[0]?.href || '/favicon.ico';
}

function setBadgeHref(href: string | null) {
  let badge = document.getElementById(BADGE_ID) as HTMLLinkElement | null;
  const originals = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
  ).filter((l) => l.id !== BADGE_ID);

  if (!href) {
    badge?.remove();
    originals.forEach((l) => l.removeAttribute('data-hidden-by-badge'));
    return;
  }

  if (!badge) {
    badge = document.createElement('link');
    badge.id = BADGE_ID;
    badge.rel = 'icon';
    document.head.appendChild(badge);
  }
  badge.type = 'image/png';
  badge.href = href;
  // Keep the badged icon last so browsers prefer it
  document.head.appendChild(badge);
}

let baseImagePromise: Promise<HTMLImageElement | null> | null = null;

function loadBaseImage(): Promise<HTMLImageElement | null> {
  if (baseImagePromise) return baseImagePromise;
  baseImagePromise = new Promise((resolve) => {
    const candidates = [getBaseFaviconHref(), '/favicon.png', '/favicon.ico'];
    let i = 0;
    const tryNext = () => {
      if (i >= candidates.length) return resolve(null);
      const src = candidates[i++];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = tryNext;
      img.src = src;
    };
    tryNext();
  });
  return baseImagePromise;
}

async function drawBadge(count: number): Promise<string | null> {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const base = await loadBaseImage();
  // Never replace the favicon with a blank icon: if the original couldn't be
  // loaded (or would taint the canvas), leave the tab icon untouched.
  if (!base) return null;

  try {
    ctx.drawImage(base, 0, 0, size, size);
  } catch {
    return null;
  }

  const label = count > 99 ? '99+' : String(count);
  const r = label.length > 2 ? 22 : 19;
  const cx = size - r - 2;
  const cy = size - r - 2;

  // Subtle ring so the badge reads clearly on top of the logo
  ctx.beginPath();
  ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#e11d48';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${label.length > 2 ? 24 : 30}px -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, cy + 1);

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null; // tainted canvas (cross-origin favicon)
  }
}


/**
 * Renders a numeric badge on the browser tab favicon (and the OS app badge
 * for installed PWAs). Pass 0 or null to clear it.
 */
export function useFaviconBadge(count: number | null | undefined) {
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    const value = count && count > 0 ? count : 0;
    if (lastRef.current === value) return;
    lastRef.current = value;

    let cancelled = false;

    if ('setAppBadge' in navigator) {
      const nav = navigator as Navigator & {
        setAppBadge?: (n?: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };
      if (value > 0) nav.setAppBadge?.(value).catch(() => {});
      else nav.clearAppBadge?.().catch(() => {});
    }

    if (value === 0) {
      setBadgeHref(null);
      return;
    }

    drawBadge(value).then((href) => {
      if (!cancelled && href) setBadgeHref(href);
    });

    return () => {
      cancelled = true;
    };
  }, [count]);

  useEffect(() => () => setBadgeHref(null), []);
}
