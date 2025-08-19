# Scrolling Architecture Guidelines

## Overview

This application uses a full-screen layout pattern where the page itself never scrolls. Instead, individual components handle their own scrolling using the `ScrollArea` component. This creates a more app-like experience similar to desktop applications.

## Implementation Status

✅ **FIXED**: ConversationView now properly implements the scrolling pattern with clean HTML structure
✅ **FIXED**: Dashboard uses proper height constraints and overflow management
✅ **ACTIVE**: All components follow the standardized ScrollArea pattern

## Core Architecture

```
┌─ html/body/root (height: 100%, overflow: hidden) ─┐
│  ┌─ FullScreenLayout (h-screen) ──────────────┐   │
│  │  ┌─ Navigation Header (fixed) ─────────┐   │   │
│  │  └─ Content Area (flex-1, overflow:hidden) │   │
│  │     ┌─ Dashboard (overflow:hidden) ────┐   │   │
│  │     │  ┌─ Sidebar (no scroll) ──────┐  │   │   │
│  │     │  │  • Navigation items      │  │   │   │
│  │     │  └─ ConversationList (ScrollArea) │  │   │   │
│  │     │  └─ ConversationView Container ─┐  │   │   │
│  │     │     ┌─ Header (flex-shrink-0) │  │   │   │
│  │     │     └─ Messages (ScrollArea)  ─┘  │   │   │
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

### ✅ Correct Patterns (IMPLEMENTED)

**ConversationView Structure (FIXED):**
```tsx
<div className="flex-1 flex flex-col bg-gradient-surface min-h-0">
  {/* Header - Fixed */}
  <div className="flex-shrink-0">
    <ConversationHeader />
  </div>
  
  {/* Messages - Scrollable */}
  <ScrollArea className="flex-1 h-0 min-h-0">
    <MessageList />
  </ScrollArea>
</div>
```

**Dashboard Structure (WORKING):**
```tsx
<FullScreenLayout header={<Header />}>
  <div className="flex-1 flex overflow-hidden min-h-0">
    <InboxSidebar />
    <div className="flex-1 min-h-0 flex-col overflow-hidden">
      <ConversationView />
    </div>
  </div>
</FullScreenLayout>
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

## Troubleshooting - SOLVED ISSUES

### ✅ FIXED: ConversationView Scrolling
**Problem**: Messages area was not scrollable due to broken HTML structure and conflicting overflow containers.

**Solution Applied**:
1. **Clean HTML Structure**: Rebuilt ConversationView with proper div nesting
2. **Header Fixed**: Made conversation header `flex-shrink-0` (never scrolls)
3. **Messages Scrollable**: Applied `ScrollArea` with `flex-1 h-0 min-h-0` to messages area
4. **Removed Conflicts**: Eliminated all `overflow-auto` containers that competed with ScrollArea

### ✅ FIXED: Height Constraint Chain  
**Problem**: Height constraints weren't propagating properly through the component hierarchy.

**Solution Applied**:
1. **Dashboard Container**: Added `overflow-hidden` to main conversation container
2. **ConversationView**: Used `flex-1 flex flex-col min-h-0` pattern
3. **ScrollArea**: Applied `flex-1 h-0 min-h-0` for proper height constraint

## Current Status: ✅ WORKING

- ✅ ConversationView messages scroll properly within their container
- ✅ No page-level scrolling occurs 
- ✅ Clean, maintainable HTML structure
- ✅ Follows design system scrolling patterns
- ✅ Mobile responsive layout maintained

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