

# Empty Inbox Celebration + Gamification + ESC Fix

## Three Changes

### 1. Empty Inbox Celebration State
Replace the plain "No conversations found" message in `ConversationTable.tsx` with a fun, animated celebration when `filteredConversations.length === 0`.

**File: `src/components/dashboard/conversation-list/ConversationTable.tsx`** (lines 57-66)

When the conversation list is empty:
- Show a confetti-style animation (CSS-only particle burst using keyframes)
- Rotating fun messages like "Inbox Zero! You're a support legend", "All clear! Time for a victory dance", "Nothing to see here — you crushed it"
- A trophy or party popper icon with a scale-in animation
- Subtle animated sparkles around the icon

### 2. "Almost There" Gamification for Low Counts
Add a motivational banner when conversations are low (1-3 remaining).

**File: `src/components/dashboard/conversation-list/ConversationTable.tsx`**

Before the table, when `filteredConversations.length` is between 1 and 3:
- Show a small animated banner: "Almost there! Just {count} left — you've got this"
- A progress-bar-style visual showing how close to zero
- Fire emoji or lightning bolt icon with a pulse animation

### 3. Fix ESC to Not Navigate When Modals Are Open
Currently `ConversationView.tsx` registers ESC to always `navigate(-1)`. This interferes with closing dialogs (AI suggestion, image lightbox, etc.).

**File: `src/components/dashboard/ConversationView.tsx`** (lines 51-57)

Change the ESC shortcut to check if any dialog/modal is open before navigating. The fix:
- Check `document.querySelector('[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"]')` — if any Radix dialog is open, let the dialog handle ESC natively and don't navigate
- Only navigate back when no overlay is active

```typescript
{
  key: 'Escape',
  action: () => {
    // Don't navigate if a dialog/lightbox is open — let it close naturally
    const openDialog = document.querySelector(
      '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-radix-dialog-overlay]'
    );
    if (openDialog) return;
    
    const historyIdx = window.history.state?.idx;
    if (historyIdx && historyIdx > 0) {
      navigate(-1);
    } else {
      navigate('/interactions/text/open');
    }
  },
  description: 'Back to inbox',
},
```

### New File
**`src/components/dashboard/conversation-list/InboxZeroCelebration.tsx`**
- Self-contained component with CSS confetti particles, rotating messages, animated trophy
- Accepts optional `count` prop for the "almost there" banner variant
- All animations via Tailwind keyframes (no external libraries)

### Files to Modify
- **New**: `src/components/dashboard/conversation-list/InboxZeroCelebration.tsx`
- **Edit**: `src/components/dashboard/conversation-list/ConversationTable.tsx` — use new celebration component
- **Edit**: `src/components/dashboard/ConversationView.tsx` — fix ESC behavior
- **Edit**: `tailwind.config.ts` — add confetti/sparkle keyframes if needed

