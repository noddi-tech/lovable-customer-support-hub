
# Fix: Scrolling in Components and Action Flows Tabs

## Problem
The `CardContent` wrapper around all tab panels in `AiChatbotSettings.tsx` uses `overflow-hidden`, which clips any content that exceeds the container height. Tabs like "Components" and "Action Flows" contain long scrollable content but have no way to scroll.

## Fix

**File: `src/components/admin/AiChatbotSettings.tsx`** (line 184)

Change `overflow-hidden` to `overflow-y-auto` on the `CardContent` that wraps all `TabsContent` panels:

```
Before: className="flex-1 min-h-0 overflow-hidden p-4"
After:  className="flex-1 min-h-0 overflow-y-auto p-4"
```

This single change allows all tab content (Components, Action Flows, Conversations, Analytics, Gaps, Error Traces) to scroll naturally within the card, while the tab header and page title remain fixed above.
