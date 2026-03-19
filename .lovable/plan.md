

## Fix Chat Reply Input Layout + Verify White Backgrounds

### Issues Identified

1. **Chat reply textarea crushed to near-zero width** — The `ChatReplyInput` component (line 403) puts the textarea AND 9 toolbar items (emoji, attachment, note, translate, mic, status selector, send button, transfer, end chat) all in a single `flex items-end` row. The textarea gets `flex-1` but the buttons consume all available space, leaving it ~10px wide. The text "Type a message..." wraps vertically character by character.

2. **Inbox grey/blue tint** — The `bg-background` token was `210 20% 98%` (grey-blue) until the previous fix changed it to pure white. The `InteractionsLayout` panels use `bg-background` everywhere. This should now be white, but may need the `main` element in `UnifiedAppLayout` to also use `bg-background` instead of `bg-card` for consistency.

3. **Customer details panel background** — `ChatCustomerPanel` uses `bg-background` (line 420), which is now pure white. No code change needed.

### Plan

#### Step 1: Restructure ChatReplyInput to two-row layout
**File:** `src/components/conversations/ChatReplyInput.tsx`

Change the layout from a single flex row to a stacked layout:
- **Top**: Textarea taking full width
- **Bottom**: Toolbar row with all action buttons

Current (line 403-621): One `flex items-end` div containing textarea + 9 buttons.

New structure:
```
<div className="border-t p-4 space-y-2">
  <!-- Textarea: full width -->
  <Textarea / MentionTextarea (full width, no flex-1 needed) />
  
  <!-- Toolbar row: all buttons in one flex-wrap row -->
  <div className="flex items-center gap-2 flex-wrap">
    [emoji] [attachment] [note] [translate] [mic]
    <div className="flex-1" /> <!-- spacer -->
    [status selector] [send] [transfer] [end chat]
  </div>
</div>
```

This matches the layout visible in the user's screenshot expectation — toolbar below the input.

#### Step 2: Ensure UnifiedAppLayout uses consistent background
**File:** `src/components/layout/UnifiedAppLayout.tsx`

The `<main>` element uses `bg-card`. Since both `bg-card` and `bg-background` are now pure white, this is cosmetically fine. But for semantic correctness, change to `bg-background` so it responds correctly if the design system is ever re-themed.

### Technical Details

- The textarea width issue is purely a CSS/layout problem — too many flex siblings in one row
- The background issue was already fixed by changing `DesignSystemContext` defaults; no further color changes needed
- The customer details panel renders correctly with the new white background

