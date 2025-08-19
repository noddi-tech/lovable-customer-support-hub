# Scrolling Architecture Guidelines

## Overview

This application uses a full-screen layout pattern where the page itself never scrolls. Instead, individual components handle their own scrolling using the `ScrollArea` component. This creates a more app-like experience similar to desktop applications.

## Core Architecture

```
┌─ html/body/root (height: 100%, overflow: hidden) ─┐
│  ┌─ FullScreenLayout (h-screen) ──────────────┐   │
│  │  ┌─ Navigation Header (fixed) ─────────┐   │   │
│  │  └─ Content Area (flex-1, overflow:hidden) │   │
│  │     ┌─ Dashboard (overflow:hidden) ────┐   │   │
│  │     │  ┌─ Sidebar (ScrollArea) ─────┐  │   │   │
│  │     │  │  • ConversationList      │  │   │   │
│  │     │  │  • Settings panels       │  │   │   │
│  │     │  └─ Main Content (ScrollArea) ─┘  │   │   │
│  │     │     • ConversationView messages  │   │   │
│  │     │     • Settings forms             │   │   │
│  │     └────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## Components

### FullScreenLayout

The `FullScreenLayout` component provides the base structure for all pages:

```tsx
import { FullScreenLayout } from "@/components/ui/full-screen-layout";

<FullScreenLayout header={navigationComponent}>
  <YourPageContent />
</FullScreenLayout>
```

**Props:**
- `header` (optional): Fixed header content that never scrolls
- `children`: Main content area with `flex-1 overflow-hidden`
- `className` (optional): Additional CSS classes

### ScrollArea

Use `ScrollArea` for any content that might overflow:

```tsx
import { ScrollArea } from "@/components/ui/scroll-area";

<ScrollArea className="flex-1 h-0 min-h-0">
  <YourScrollableContent />
</ScrollArea>
```

**Key Classes:**
- `flex-1`: Takes remaining height in flex container
- `h-0`: Prevents content from expanding parent
- `min-h-0`: Allows flex item to shrink below content size

## Implementation Guidelines

### ✅ Correct Patterns

**Page Structure:**
```tsx
<FullScreenLayout header={<Navigation />}>
  <div className="flex h-full overflow-hidden">
    <ScrollArea className="w-64 border-r">
      <Sidebar />
    </ScrollArea>
    <ScrollArea className="flex-1 h-0 min-h-0">
      <MainContent />
    </ScrollArea>
  </div>
</FullScreenLayout>
```

**Component with Internal Scrolling:**
```tsx
<div className="flex-1 flex flex-col overflow-hidden">
  <div className="p-4 border-b">
    <Header />
  </div>
  <ScrollArea className="flex-1 h-0 min-h-0">
    <Content />
  </ScrollArea>
</div>
```

### ❌ Incorrect Patterns

**Don't use `overflow-auto` on main containers:**
```tsx
// ❌ Wrong - causes page scrolling
<div className="h-screen overflow-auto">
  <Content />
</div>
```

**Don't forget `h-0 min-h-0` on flex ScrollArea:**
```tsx
// ❌ Wrong - ScrollArea won't constrain height
<ScrollArea className="flex-1">
  <Content />
</ScrollArea>
```

**Don't nest ScrollArea unnecessarily:**
```tsx
// ❌ Wrong - creates nested scroll containers
<ScrollArea>
  <ScrollArea>
    <Content />
  </ScrollArea>
</ScrollArea>
```

## CSS Foundation

The global CSS disables page-level scrolling:

```css
html, body, #root {
  height: 100%;
  overflow: hidden;
}
```

This ensures the viewport is always exactly the browser window height and prevents any content from causing page-level scrolling.

## Debugging Tips

### Content Not Scrolling
- Ensure parent container has `overflow-hidden`
- Add `h-0 min-h-0` to flex ScrollArea components
- Check that content actually exceeds container height

### Unexpected Page Scrolling
- Verify global CSS is applied (`html, body, #root`)
- Check for `overflow-auto` or `overflow-scroll` on containers
- Ensure FullScreenLayout is used at the page level

### ScrollArea Not Visible
- Confirm parent container has defined height
- Check for conflicting CSS that might hide scrollbars
- Verify content exceeds container dimensions

## Performance Considerations

- Use `ScrollArea` only when content might overflow
- Prefer native browser scrolling for simple cases
- Avoid deeply nested scroll containers
- Consider virtualization for very long lists

## Browser Compatibility

This pattern works in all modern browsers that support:
- CSS Flexbox
- CSS Grid (optional)
- `overflow: hidden`
- Custom scrollbars (via Radix ScrollArea)

## Migration Checklist

When converting existing components to this pattern:

1. [ ] Wrap page in `FullScreenLayout`
2. [ ] Replace page-level `overflow-auto` with `overflow-hidden`
3. [ ] Add `ScrollArea` to scrollable content sections
4. [ ] Add `h-0 min-h-0` to flex ScrollArea components
5. [ ] Test scrolling behavior in different viewport sizes
6. [ ] Verify no page-level scrolling occurs

## Examples

See these components for reference implementations:
- `src/pages/MainApp.tsx` - FullScreenLayout usage
- `src/components/dashboard/ConversationList.tsx` - ScrollArea in list
- `src/components/dashboard/ConversationView.tsx` - ScrollArea in messages
- `src/components/dashboard/InboxSidebar.tsx` - ScrollArea in sidebar