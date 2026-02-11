
# Widen AI Chatbot Layout

## Problem
The `AdminPortalLayout` wraps all content in `max-w-7xl mx-auto` (line 337), capping width at ~1280px. Combined with the 280px widget selector sidebar and padding, the flowchart canvas gets squeezed, making it hard to work with the diagram.

## Solution

Two changes to give the AI Chatbot page full width:

### 1. `AdminPortalLayout.tsx` -- Remove max-width constraint for AI Chatbot route
On line 337, conditionally drop `max-w-7xl mx-auto` when the current route is `/admin/ai-chatbot`. Use `useLocation()` (already imported) to detect the route and skip the max-width class.

```tsx
// Line 337 changes from:
<div className="px-8 py-6 max-w-7xl mx-auto">

// To conditionally:
const isFullWidth = location.pathname === '/admin/ai-chatbot';
// ...
<div className={cn("py-6", isFullWidth ? "px-4" : "px-8 max-w-7xl mx-auto")}>
```

### 2. `AiChatbotSettings.tsx` -- Reduce widget selector width and tighten gaps
- Shrink the widget selector card from `w-[280px]` to `w-[220px]` 
- Reduce the flex gap from `gap-6` to `gap-4`
- This gives even more room to the flow canvas

### Files Changed
| File | Change |
|------|--------|
| `src/components/admin/AdminPortalLayout.tsx` | Conditionally remove `max-w-7xl mx-auto` for the AI Chatbot route, reduce horizontal padding |
| `src/components/admin/AiChatbotSettings.tsx` | Shrink widget selector width from 280px to 220px, tighten gap |
