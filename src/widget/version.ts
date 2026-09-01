/**
 * Widget build stamp shown in the panel footer.
 * Values are injected at build time by vite.widget.config.ts; the fallbacks
 * keep dev/preview builds working.
 */
declare const __WIDGET_VERSION__: string | undefined;
declare const __WIDGET_BUILD_TIME__: string | undefined;

export const WIDGET_VERSION: string =
  typeof __WIDGET_VERSION__ !== 'undefined' && __WIDGET_VERSION__ ? __WIDGET_VERSION__ : 'dev';

export const WIDGET_BUILD_TIME: string =
  typeof __WIDGET_BUILD_TIME__ !== 'undefined' && __WIDGET_BUILD_TIME__
    ? __WIDGET_BUILD_TIME__
    : new Date().toISOString();

/** e.g. "v1.4.0 · 2026-09-01 21:52 UTC" */
export function formatBuildStamp(
  version: string = WIDGET_VERSION,
  buildTime: string = WIDGET_BUILD_TIME,
): string {
  const date = new Date(buildTime);
  if (Number.isNaN(date.getTime())) return `v${version}`;
  const iso = date.toISOString();
  return `v${version} · ${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
