

# Home Page Fixes: Scroll, Counts, and Visual Polish

## Problems
1. **No scroll**: `HomePage` is rendered without `UnifiedAppLayout`, so it lacks the app shell (sidebar + scrollable main area)
2. **Inbox counts show total conversations**, not open/unread — the RPC returns `conversation_count` which is all conversations, but users expect to see open/unread
3. **Cards are too large and sections lack color** — everything looks the same, hard to scan

## Changes

### 1. Wrap HomePage in UnifiedAppLayout
**File: `src/pages/HomePage.tsx`**
- Import and wrap content in `<UnifiedAppLayout>` — this gives the page the sidebar, scroll container, and consistent layout

### 2. Show open/unread label on inbox cards
**File: `src/pages/HomePage.tsx`**
- The `conversation_count` from the RPC is what we have per-inbox. Add a small label like "conversations" under the count so it's clear what it represents
- This is a data limitation — per-inbox open/unread would require a new RPC. For now, label clearly

### 3. Make cards compact and add section colors
**File: `src/pages/HomePage.tsx`**
- **Stats cards**: Reduce padding from `p-4` to `p-3`, shrink icon from `h-8 w-8` to `h-6 w-6`, reduce number size from `text-2xl` to `text-xl`
- **Inbox cards**: Reduce padding, use smaller text
- **Section link cards**: Reduce padding from `p-4` to `p-3`, remove descriptions (just show icon + label + arrow) for a tighter grid
- **Section headers**: Add a colored left border or subtle background tint per section:
  - Interactions: blue accent
  - Marketing: purple accent
  - Operations: amber accent
  - Settings: slate accent
- **Section link icons**: Color-code to match section (blue for interactions items, purple for marketing, etc.)

### Files to modify
- `src/pages/HomePage.tsx` — add UnifiedAppLayout wrapper, compact cards, add section colors

