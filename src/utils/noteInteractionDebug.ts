/**
 * Targeted note-interaction diagnostics.
 *
 * Gated behind VITE_NOTE_DEBUG=1 so it stays silent in production unless
 * we explicitly turn it on. All output goes through the centralized logger
 * (which already handles dedup + level filtering) — never raw console.log.
 *
 * Use these helpers from:
 *   - MentionTextarea (suggestion lifecycle)
 *   - InlineNoteEditor (mount/unmount)
 *   - MessageCard / ChatMessagesList / MobileChatBubble (dropdown -> dialog -> delete)
 *   - useNoteMutations (mutation lifecycle)
 *   - ChatReplyInput (Enter key behavior while menu open)
 */
import { logger } from './logger';

const COMPONENT = 'NoteDebug';

export const isNoteDebugEnabled = (): boolean => {
  try {
    return import.meta.env.VITE_NOTE_DEBUG === '1';
  } catch {
    return false;
  }
};

/** Snapshot of any global UI state that could explain a frozen screen. */
export interface BodyLockSnapshot {
  bodyPointerEvents: string;
  bodyOverflow: string;
  htmlPointerEvents: string;
  htmlOverflow: string;
  /** Number of Radix overlay/content nodes still in the DOM. */
  radixOverlayCount: number;
  radixContentCount: number;
  /** Number of fixed-position elements that visually cover ≥80% of the viewport. */
  fullscreenFixedCount: number;
  activeElement: string;
  hasAriaHiddenOnRoot: boolean;
}

export const captureBodyLockSnapshot = (): BodyLockSnapshot => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      bodyPointerEvents: '',
      bodyOverflow: '',
      htmlPointerEvents: '',
      htmlOverflow: '',
      radixOverlayCount: 0,
      radixContentCount: 0,
      fullscreenFixedCount: 0,
      activeElement: '',
      hasAriaHiddenOnRoot: false,
    };
  }

  const body = document.body;
  const html = document.documentElement;
  const overlays = document.querySelectorAll('[data-radix-popper-content-wrapper], [data-state][data-radix-overlay], [data-radix-dialog-overlay], [data-radix-alert-dialog-overlay]');
  const contents = document.querySelectorAll('[data-radix-dialog-content], [data-radix-alert-dialog-content], [data-radix-dropdown-menu-content]');

  let fullscreenFixedCount = 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fixed = document.querySelectorAll('*');
  // Cheap check: only inspect a small candidate set (overlays + dialogs)
  overlays.forEach((el) => {
    const rect = (el as HTMLElement).getBoundingClientRect();
    if (rect.width >= vw * 0.8 && rect.height >= vh * 0.8) fullscreenFixedCount++;
  });

  const active = document.activeElement as HTMLElement | null;
  const activeElement = active
    ? `${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ''}${active.className && typeof active.className === 'string' ? `.${active.className.toString().split(' ').slice(0, 2).join('.')}` : ''}`
    : 'none';

  // Suppress unused-var warning while keeping the broad query for future inspection.
  void fixed;

  return {
    bodyPointerEvents: body.style.pointerEvents || getComputedStyle(body).pointerEvents,
    bodyOverflow: body.style.overflow || getComputedStyle(body).overflow,
    htmlPointerEvents: html.style.pointerEvents || getComputedStyle(html).pointerEvents,
    htmlOverflow: html.style.overflow || getComputedStyle(html).overflow,
    radixOverlayCount: overlays.length,
    radixContentCount: contents.length,
    fullscreenFixedCount,
    activeElement,
    hasAriaHiddenOnRoot: document.getElementById('root')?.getAttribute('aria-hidden') === 'true',
  };
};

/** Detect whether the page appears interaction-locked (body pointer-events: none or full overlay still present). */
export const detectInteractionLock = (snap: BodyLockSnapshot): boolean => {
  if (snap.bodyPointerEvents === 'none') return true;
  if (snap.fullscreenFixedCount > 0) return true;
  if (snap.hasAriaHiddenOnRoot) return true;
  return false;
};

interface NoteEventPayload {
  [key: string]: any;
}

/** Emit a note-interaction event via the central logger. No-op when disabled. */
export const noteDebug = (
  event: string,
  payload: NoteEventPayload = {},
  source?: string
): void => {
  if (!isNoteDebugEnabled()) return;
  logger.debug(`note:${event}`, payload, source ? `${COMPONENT}:${source}` : COMPONENT);
};

/** Same as noteDebug but flagged as a warning (e.g. detected lock). */
export const noteDebugWarn = (
  event: string,
  payload: NoteEventPayload = {},
  source?: string
): void => {
  if (!isNoteDebugEnabled()) return;
  logger.warn(`note:${event}`, payload, source ? `${COMPONENT}:${source}` : COMPONENT);
};

/**
 * Run a watchdog after a dialog/dropdown closes and log whether the page
 * appears stuck. Two snapshots: one on the next tick, one ~250ms later.
 */
export const scheduleInteractionLockWatchdog = (
  source: string,
  context: NoteEventPayload = {}
): void => {
  if (!isNoteDebugEnabled()) return;
  if (typeof window === 'undefined') return;

  // Tick 0: immediately after close
  Promise.resolve().then(() => {
    const snap = captureBodyLockSnapshot();
    const locked = detectInteractionLock(snap);
    const event = locked ? 'interaction_lock_detected' : 'body_lock_snapshot';
    (locked ? noteDebugWarn : noteDebug)(event, { phase: 'tick0', ...context, snapshot: snap }, source);
  });

  // Tick ~250ms: after Radix removal animations should be done
  setTimeout(() => {
    const snap = captureBodyLockSnapshot();
    const locked = detectInteractionLock(snap);
    const event = locked ? 'interaction_lock_detected' : 'body_lock_snapshot';
    (locked ? noteDebugWarn : noteDebug)(event, { phase: 'tick250', ...context, snapshot: snap }, source);
  }, 250);
};
