/**
 * Centralized helper for "back to inbox" navigation from conversation views.
 * Determines the correct return path based on the current URL context.
 */

export function getConversationBackPath(pathname: string): string {
  // Extract channel type (text/chat) from current path
  const match = pathname.match(/\/interactions\/(text|chat)\//);
  const type = match?.[1] || 'text';
  return `/interactions/${type}/open`;
}

/**
 * Determines whether we can safely navigate back in history,
 * or should use a deterministic fallback path.
 * 
 * React Router stores an `idx` in history state. If idx > 0, the user
 * arrived here via in-app navigation and navigate(-1) is safe.
 * If idx === 0 or undefined, the user landed directly (external link,
 * bookmark, Slack) — navigate(-1) would leave the app.
 */
export function canGoBackInApp(): boolean {
  const idx = (window.history.state as any)?.idx;
  return typeof idx === 'number' && idx > 0;
}
