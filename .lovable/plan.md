

## Plan: White background across all main content areas

### Problem
The main content areas (inbox, chat, conversation view) use `bg-background` which maps to a light grey. The user wants pure white everywhere.

### Changes

| File | Line(s) | Change |
|---|---|---|
| `src/components/layout/UnifiedAppLayout.tsx` | 37 | `<main>` class: `bg-background` → `bg-card` |
| `src/components/dashboard/chat/ChatLayout.tsx` | 93, 95 | Both `bg-background` → `bg-card` |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | 161, 178 | Both `bg-background` → `bg-card` |

The outer `<div>` in `UnifiedAppLayout` (line 32) stays `bg-background` — it's the full-page shell behind the sidebar and acts as a neutral frame. The `<main>` content area inside it gets `bg-card` so all content panels render white.

4 lines changed across 3 files.

