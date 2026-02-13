

# Fix: AI Chatbot Page Fills Available Space (No Scroll Past Header)

## Root Cause

The page content (title + card header/tabs + alert + buttons + 600px preview) totals ~920px+, but the available space inside PaneScroll is only ~900px. This causes the ScrollArea to scroll, pushing the card header and tabs out of view. Previous fixes only addressed the widget preview height but never tackled the real issue: the entire page needs to fit within the available viewport space using flex layout, not overflow and scroll.

## Solution

Make every container in the chain from `LayoutContent` down to the preview use flex layout to fill available space. No fixed pixel heights, no viewport calculations. The preview simply takes whatever space remains after the fixed-height elements (title, tabs, alert, buttons).

### Change 1 -- LayoutContent (AdminPortalLayout.tsx, line 302)

For the ai-chatbot route, make the content wrapper fill available height:

```tsx
const LayoutContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isFullWidth = location.pathname === '/admin/ai-chatbot';
  return (
    <div className={cn(
      "py-6",
      isFullWidth ? "px-4 h-full flex flex-col" : "px-8 max-w-7xl mx-auto"
    )}>
      {children}
    </div>
  );
};
```

### Change 2 -- AiChatbotSettings.tsx

Make the component fill its parent instead of using `space-y-6`:

- Outer div: `h-full flex flex-col gap-4` (instead of `space-y-6`)
- Title block: add `shrink-0`
- Flex row (sidebar + card): add `flex-1 min-h-0`
- Main Card: add `flex-1 min-h-0 flex flex-col`
- Tabs wrapper: add `flex-1 min-h-0 flex flex-col` and `className="w-full flex-1 flex flex-col min-h-0"`
- CardHeader: add `shrink-0`
- CardContent: add `flex-1 min-h-0 overflow-hidden p-4` (reduced padding)

### Change 3 -- WidgetTestMode.tsx

Make the component fill available space:

- Outer div: `flex flex-col gap-4 h-full min-h-0` (add h-full min-h-0)
- Alert and button bar: add `shrink-0`
- Grid: `flex-1 min-h-0` to fill remaining space
- Preview: change `h-[600px] max-h-[60vh]` to just `h-full` -- it now takes whatever the grid cell gives it

## Result

The entire page becomes a flex chain from PaneScroll all the way down to the preview. Each level fills exactly the available space. The title, tabs, alert, and buttons stay visible because they are `shrink-0`. The preview takes all remaining space. No scrolling needed, no pixel guessing.

## Technical Details

Files modified:
- `src/components/admin/AdminPortalLayout.tsx` (LayoutContent)
- `src/components/admin/AiChatbotSettings.tsx` (flex layout chain)
- `src/components/admin/widget/WidgetTestMode.tsx` (fill available space)

