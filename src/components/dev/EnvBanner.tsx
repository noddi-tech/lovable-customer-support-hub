/**
 * Slim environment banner shown at the very top of the app.
 * Renders nothing on production (published domain + prod build).
 */
import { useEffect } from 'react';

const BANNER_HEIGHT = '1.25rem';

export const EnvBanner = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isDev = import.meta.env.DEV === true;
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  const isLovablePreview = host.includes('id-preview--') || host.includes('.lovableproject.com');

  let label: string | null = null;
  let tone = '';

  if (isLocal) {
    label = `LOCAL DEV · ${window.location.host}`;
    tone = 'bg-emerald-600 text-white';
  } else if (isLovablePreview) {
    label = `LOVABLE PREVIEW · ${isDev ? 'dev build' : 'prod build'}`;
    tone = 'bg-amber-500 text-black';
  } else if (isDev) {
    label = `DEV BUILD · ${host}`;
    tone = 'bg-amber-500 text-black';
  }

  // Reserve space so the banner pushes the app down instead of covering it.
  useEffect(() => {
    const root = document.documentElement;
    if (label) {
      root.style.setProperty('--env-banner-h', BANNER_HEIGHT);
    } else {
      root.style.removeProperty('--env-banner-h');
    }
    return () => {
      root.style.removeProperty('--env-banner-h');
    };
  }, [label]);

  if (!label) return null; // production — stay silent

  return (
    <div
      className={`sticky inset-x-0 top-0 z-[9999] h-5 flex items-center justify-center text-[10px] font-semibold tracking-wide uppercase ${tone}`}
    >
      {label}
    </div>
  );
};
