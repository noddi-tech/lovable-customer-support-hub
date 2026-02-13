

# Fix: Admin Portal Header Clipped on AI Chatbot Page

## Root Cause

The AI Chatbot page layout chain has two sources of wasted vertical space that push the top content out of view:

1. **Empty desktop header** (AdminPortalLayout line 323): The `<header>` bar has `p-4 border-b` (~49px) but ALL its children are `lg:hidden`, making it an invisible spacer on desktop
2. **Excessive padding** in LayoutContent: `py-6` adds 48px of vertical padding

Combined, this wastes ~97px. With `overflow-hidden` on the wrapper (line 349), the top content gets clipped rather than scrolling.

Additionally, `.noddi-widget-content` in widget.css has `min-height: 200px` and `.noddi-chat-messages` has `min-height: 200px` -- while the CSS overrides in the `<style>` tag DO handle `.noddi-widget-chat` and `.noddi-chat-messages`, the `.noddi-widget-content` override only sets `min-height: 0` which correctly overrides. So CSS overrides are fine.

## Solution: 3 Small Changes

### File 1: `src/components/admin/AdminPortalLayout.tsx`

**Change A -- Hide the empty header on desktop for the ai-chatbot route (line 323):**
Add `hidden lg:hidden` or conditionally render the header only when needed. Simplest: add a class to collapse it on the ai-chatbot route.

```tsx
{/* Only show header bar when it has visible content (mobile) or skip for full-height pages */}
{location.pathname !== '/admin/ai-chatbot' && (
  <header className="flex items-center gap-4 p-4 border-b border-border bg-primary/5 backdrop-blur-sm lg:hidden">
    ...
  </header>
)}
```

Wait -- the header is already `lg:hidden` for all its children, but the `<header>` element itself is always visible. The simplest fix is to add `lg:hidden` to the header element itself so it collapses on desktop across ALL admin pages, not just ai-chatbot:

```tsx
<header className="flex items-center gap-4 p-4 border-b border-border bg-primary/5 backdrop-blur-sm lg:hidden">
```

This saves ~49px on desktop.

**Change B -- Reduce padding for the ai-chatbot LayoutContent (line 306):**
Change `py-6` to `py-2` for the full-height variant:

```tsx
<div className={cn(
  isFullHeight ? "px-4 py-2 h-full flex flex-col" : "py-6 px-8 max-w-7xl mx-auto"
)}>
```

This saves another 32px.

### File 2: `src/components/admin/widget/WidgetTestMode.tsx`

No changes needed -- the flex chain from the previous fix is correct. The extra space recovered from the header and padding fixes above will give the preview more room.

## Summary

Two targeted edits in `AdminPortalLayout.tsx`:
1. Add `lg:hidden` to the `<header>` element so it doesn't waste 49px on desktop
2. Reduce `py-6` to `py-2` for the ai-chatbot route to recover 32px

Total recovered: ~81px, which should ensure everything fits within the viewport without clipping.

