
# Fix: Constrain Widget Height in Test Mode

## Problem

The widget panel in test mode still expands beyond its container because of conflicting CSS. The `.noddi-widget-panel` class sets `position: fixed` and `max-height: calc(100vh - 120px)`, and the `.noddi-widget-content` class sets `min-height: 200px`. The inline styles try to override these but CSS specificity issues cause the content to keep growing.

## Solution

Add `min-height: 0` to the `.noddi-widget-content` wrapper's inline styles (to allow flex shrinking) and ensure the panel's `overflow: hidden` is properly enforced. Also add `overflow: hidden` to the outer container div to prevent any overflow.

## Changes

**File: `src/components/admin/widget/WidgetTestMode.tsx`**

1. On the `.noddi-widget-content` wrapper (line 154), add `minHeight: 0, overflow: 'hidden'` to the inline style so it can shrink within the flex container instead of being forced to at least 200px:

```tsx
{/* Before */}
<div className="noddi-widget-content" style={{ padding: 0 }}>

{/* After */}
<div className="noddi-widget-content" style={{ padding: 0, minHeight: 0, overflow: 'hidden' }}>
```

2. On the `.noddi-widget-panel` div (lines 127-138), add `!important`-equivalent overrides by adding `minHeight: 0` to prevent the CSS class defaults from interfering:

```tsx
{/* Add to existing inline styles */}
minHeight: 0,
```

This ensures the flex layout properly constrains the content area, making messages scroll internally rather than expanding the widget.
