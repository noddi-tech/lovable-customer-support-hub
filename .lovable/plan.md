

# Mobile UX Fixes: Input Zoom + Horizontal Scroll + Polish

## Problem Analysis

1. **iOS input zoom causing horizontal scroll**: The viewport meta tag (`index.html` line 5) is `width=device-width, initial-scale=1.0` without `maximum-scale=1`. When iOS Safari focuses an input with font-size < 16px, it zooms in. The CSS at line 1578 already sets `font-size: 16px` for inputs/textareas on mobile, but the `Textarea` components in `ChatReplyInput.tsx` and `ReplyArea.tsx` use Tailwind classes like `text-sm` (14px) which override the global CSS rule due to specificity. After zoom, the page becomes wider than the viewport, creating horizontal scroll that persists after blur.

2. **Toolbar overflow on mobile**: `ChatReplyInput.tsx` line 586 has a toolbar row with emoji, attachment, AI suggest, note, translate, mic, reply-status selector, send button, transfer, and end chat — all in one `flex-wrap` row. On a 390px viewport, this wraps into multiple rows and some elements overflow.

## Surgical Fixes

### 1. Prevent iOS zoom — viewport meta tag
**File: `index.html`** (line 5)
Add `maximum-scale=1` to the viewport meta tag. This is the standard approach used by most mobile-first apps (Slack, Discord, etc.).

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
```

### 2. Prevent horizontal scroll on mobile
**File: `src/index.css`** — Add a mobile-scoped rule:
```css
@media (max-width: 767px) {
  html, body, #root {
    overflow-x: hidden;
    max-width: 100vw;
  }
}
```

### 3. Mobile-optimized ChatReplyInput toolbar
**File: `src/components/conversations/ChatReplyInput.tsx`** (lines 586-775)

On mobile, simplify the toolbar:
- Hide the reply-status selector (default to "closed"), transfer button text, end-chat text — show only icons
- Hide the mic button (it's disabled/placeholder anyway)
- Hide "AI Suggest" text label, show only icon
- Use `useIsMobile()` hook (already available in the project) to conditionally render

### 4. Mobile-optimized ReplyArea controls
**File: `src/components/dashboard/conversation-view/ReplyArea.tsx`** (lines 363-535, 617-691)

The controls row already uses `isMobile` to hide some text labels. Additional fixes:
- Ensure the bottom action bar (`flex-wrap`) doesn't overflow — on mobile, stack Send button full-width below the cancel button
- Hide Reply/ReplyAll dropdown on mobile (already hidden, good)
- Hide status selector on mobile (already hidden, good)

### 5. Ensure textarea gets 16px on mobile (specificity fix)
**File: `src/index.css`** (line 1577-1580) — increase specificity:
```css
@media (max-width: 767px) {
  input, textarea, select,
  .min-h-\\[80px\\],
  textarea[class] {
    font-size: 16px !important;
  }
}
```

## Files to Modify
- **`index.html`** — Add `maximum-scale=1` to viewport
- **`src/index.css`** — Add `overflow-x: hidden` on mobile + fix textarea font-size specificity
- **`src/components/conversations/ChatReplyInput.tsx`** — Import `useIsMobile`, simplify toolbar on mobile (icons-only for secondary actions, hide placeholder mic button)

