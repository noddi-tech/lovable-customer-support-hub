

# Bulletproof ESC + Back Navigation Fix

## Root Causes

1. **ESC fires multiple handlers**: Three independent `window.addEventListener('keydown')` listeners all react to Escape simultaneously:
   - `App.tsx` line 82: "Emergency" handler force-clicks triggers on all `[data-state="open"]` elements
   - `ConversationView.tsx` line 52: `useKeyboardShortcuts` handler navigates back — the DOM query for open dialogs races with App.tsx's handler which closes them first
   - `image-lightbox.tsx` line 50: Its own Escape listener calls `onClose()`
   
   The race: App.tsx closes dialogs, then ConversationView checks for open dialogs (finds none — they were just closed), then navigates back. One keypress = modal closes AND navigates away.

2. **Back navigation unreliable from external links**: `window.history.state?.idx` is React Router internal state and `window.history.length` includes cross-origin entries. When arriving from Slack/email, `navigate(-1)` goes to the external site instead of the inbox. The fallback `/interactions/text/open` doesn't preserve the correct inbox or channel (chat vs text).

## Fix

### 1. Remove App.tsx emergency Escape handler (lines 80-100)
This handler is destructive — Radix dialogs already handle Escape natively. This handler force-clicks triggers which fights with Radix's own close logic and removes dialogs before other handlers can detect them. Delete it entirely.

### 2. Make `useKeyboardShortcuts` modal-aware for Escape
In `useKeyboardShortcuts.ts`, before running any Escape shortcut action, check if a dialog/overlay/popover is open. If so, skip the action entirely (let Radix handle it). Also check `event.defaultPrevented`.

```typescript
if (keyMatch && shortcut.key.toLowerCase() === 'escape') {
  const hasOpenModal = document.querySelector(
    '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-radix-dialog-overlay], [data-radix-popover-content], [data-radix-dropdown-menu-content]'
  );
  if (hasOpenModal || event.defaultPrevented) return;
}
```

### 3. Remove duplicate Escape listener from image-lightbox.tsx
The lightbox uses `<Dialog>` which already handles Escape via Radix. The manual `keydown` listener on line 47-51 for Escape is redundant and contributes to double-handling. Keep only ArrowLeft/ArrowRight.

### 4. Centralize "back to inbox" logic
Create a small helper `getConversationBackPath()` that determines the correct return path based on the current URL context:

```typescript
export function getConversationBackPath(location: Location): string {
  // Extract type (text/chat) from current path
  const match = location.pathname.match(/\/interactions\/(text|chat)\//);
  const type = match?.[1] || 'text';
  return `/interactions/${type}/open`;
}
```

Use this in ConversationView.tsx, ConversationViewContent.tsx, and ConversationHeader.tsx instead of hardcoded `/interactions/text/open`. For back navigation: try `navigate(-1)` only if React Router's `idx > 0`, otherwise use the deterministic fallback.

### Files to modify
- **`src/App.tsx`** — Delete emergency Escape handler (lines 80-100)
- **`src/hooks/useKeyboardShortcuts.ts`** — Add modal-awareness for Escape key
- **`src/components/ui/image-lightbox.tsx`** — Remove Escape from manual keydown listener
- **`src/components/dashboard/ConversationView.tsx`** — Use centralized back path
- **`src/components/dashboard/conversation-view/ConversationViewContent.tsx`** — Use centralized back path
- **`src/components/dashboard/conversation-view/ConversationHeader.tsx`** — Use centralized back path

