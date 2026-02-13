

# Fix: Make Widget Test Preview Fill Available Screen Space

## Problem

The widget test container uses fixed `min-h-[750px]` and `maxHeight: 700px` values, which still crop the top of the chat. The header ("Tilbake", "Start ny samtale") is cut off.

## Solution

Remove fixed height constraints and make the preview container fill the available viewport height using `h-[calc(100vh-200px)]` instead of a fixed `min-h`. The inner widget container and panel should also stretch to fill their parent rather than being capped at a fixed pixel height.

## Changes

**File: `src/components/admin/widget/WidgetTestMode.tsx`**

### Line 120 - Outer container
- Replace `min-h-[750px]` with `h-[calc(100vh-200px)]` so it fills the screen minus header/controls space

### Line 124 - Widget container div
- Change `maxHeight: '700px'` to `maxHeight: '100%'` so it fills the outer container

### Line 133 - Widget panel div
- Change `maxHeight: '700px'` to `maxHeight: '100%'` so the panel stretches to fill

This ensures the widget preview always fills the available screen space regardless of viewport size, and the internal chat scrolls naturally within it.

