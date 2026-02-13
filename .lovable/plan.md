

# Fix: Constrain Widget Height So Chat Scrolls Instead of Expanding

## Problem

The chat messages area keeps growing taller with each message instead of scrolling within a fixed container. This happens because the parent containers only set `maxHeight: 100%` without setting an explicit `height`, so the CSS `flex: 1` on `.noddi-chat-messages` has no bounded parent to flex within.

## Solution

Set explicit `height` values on both the widget container and panel so the flex layout properly constrains the chat area and enables scrolling.

## Changes

**File: `src/components/admin/widget/WidgetTestMode.tsx`**

### Line 120 -- Outer dashed container
- Change `items-end` to `items-stretch` so the widget fills the container vertically instead of floating at the bottom

### Line 124 -- Widget container div
- Add `height: '100%'` alongside `maxHeight: '100%'`

### Line 128-137 -- Widget panel div
- Add `height: '100%'` alongside `maxHeight: '100%'`

These three changes give the chat a bounded height context, so `.noddi-chat-messages` (which has `flex: 1; overflow-y: auto`) will scroll instead of growing.

