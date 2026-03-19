

## Improve @Mention Styling Across the App

### Current State
- **`MentionRenderer`** exists with light styling (`bg-primary/10 text-primary font-medium` in a rounded pill) — functional but subtle
- Used in only **2 places**: `CustomerNotes.tsx` and `TicketCommentsList.tsx`
- **Missing entirely** from chat messages (`ChatMessagesList.tsx`) and email thread view (`MessageCard.tsx`) — mentions render as plain text there

### Best Practice
Industry standard (Slack, Linear, Notion, GitHub) is a distinctly colored pill/chip: bold name, colored background, slightly rounded — immediately scannable. The current `MentionRenderer` is close but could be more prominent.

### Plan

#### 1. Enhance `MentionRenderer` styling
**File:** `src/components/ui/mention-renderer.tsx`

Update the mention span styling to be more visually prominent:
- Add a slightly stronger background: `bg-primary/15` → more visible
- Add `font-semibold` instead of `font-medium`
- Add a subtle border: `ring-1 ring-primary/20`
- Keep the rounded pill shape

This is a single class change on line 41.

#### 2. Add `MentionRenderer` to `ChatMessagesList.tsx`
**File:** `src/components/conversations/ChatMessagesList.tsx`

Wrap the message body content through `MentionRenderer` for internal notes (where mentions are most common). For internal notes, replace the raw `EmailRender` output with a `MentionRenderer` wrapper, or add a post-render pass. Since `EmailRender` handles HTML, the simplest approach: for `text/plain` internal notes, render via `MentionRenderer` instead of `EmailRender`.

#### 3. Add `MentionRenderer` to `MessageCard.tsx`
**File:** `src/components/conversations/MessageCard.tsx`

Same approach — for internal notes rendered in the email/thread view, wrap content through `MentionRenderer` to highlight tagged names.

#### 4. Verify existing usages still look good
The two existing consumers (`CustomerNotes.tsx`, `TicketCommentsList.tsx`) will automatically pick up the enhanced styling from Step 1.

### Summary of Changes
| File | Change |
|------|--------|
| `mention-renderer.tsx` | Stronger pill styling (bolder, more visible background) |
| `ChatMessagesList.tsx` | Use `MentionRenderer` for internal note content |
| `MessageCard.tsx` | Use `MentionRenderer` for internal note content |

