

# Center Widget Inside the Dashed Card

## Problem
The widget overflows the dashed-border container because `overflow-visible` was set (to fix the header clipping). The header escapes the card and overlaps buttons above.

## Fix

**Single file change: `src/components/admin/widget/WidgetTestMode.tsx` (line 120)**

Change the dashed container classes from:
```
items-start justify-center min-h-[500px] overflow-visible relative z-0 pt-4
```
to:
```
items-center justify-center min-h-[500px] overflow-hidden relative z-0
```

This puts the widget back to centered within the card and clips anything that tries to escape. The header clipping issue from before was caused by `items-start` pushing it to the top edge -- with `items-center` and proper container height, the widget will be vertically and horizontally centered inside the dashed card without overflow.

| File | Change |
|------|--------|
| `src/components/admin/widget/WidgetTestMode.tsx` | Line 120: revert to `overflow-hidden`, use `items-center`, remove `pt-4` |

