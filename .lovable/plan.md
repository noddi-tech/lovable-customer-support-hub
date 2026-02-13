

# Bulletproof Fix: Widget Test Mode Height

## Root Cause (found this time for real)

`WidgetTestMode` is rendered inside a deeply nested layout:

```text
Viewport (100vh)
  Page header/nav         ~64px
  AdminPortal content     ~padding
  Card                    ~border/padding
    CardHeader            ~120px (title + description + 6 tabs)
    CardContent           ~24px padding
      WidgetTestMode
        Alert             ~70px
        Button bar        ~40px
        Grid (preview + log)
```

The current `h-[calc(100vh-180px)]` only subtracts 180px, but the actual offset from the top of the viewport to the grid is roughly 350-400px. This means the component overshoots by ~200px, pushing the page header off-screen.

## Solution: Stop guessing viewport offsets

Instead of trying to calculate the exact pixel offset (which breaks whenever the layout changes), use a fixed max-height on the preview container and let the page scroll naturally.

### File: `src/components/admin/widget/WidgetTestMode.tsx`

**Change 1 -- Remove viewport-based height from outer wrapper (line 78):**
```tsx
// Before
<div className="flex flex-col gap-4 h-[calc(100vh-180px)] overflow-hidden">

// After
<div className="flex flex-col gap-4">
```
No more guessing. Let it flow naturally.

**Change 2 -- Give the preview container a fixed max-height (line 120):**
```tsx
// Before
<div className="widget-test-preview ... h-full overflow-hidden ...">

// After
<div className="widget-test-preview ... h-[600px] max-h-[60vh] overflow-hidden ...">
```
This gives a sensible fixed height (600px) capped at 60% of the viewport. It will never push the page header off-screen regardless of the nesting depth.

**Change 3 -- Remove `flex-1 min-h-0` from grid (line 118):**
```tsx
// Before
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

// After
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
```
No longer needed since the outer wrapper isn't constraining height.

**Change 4 -- Remove `flex-shrink-0` from Alert and button bar (lines 79, 88):**
Not needed since the parent no longer has a fixed height. Can be kept harmlessly, but cleaning up for clarity.

## Why this is truly bulletproof

- No viewport calculations that depend on knowing the exact nesting depth
- The preview has its own self-contained height (600px / 60vh, whichever is smaller)
- The page scrolls naturally if the content is too tall for the screen
- Works regardless of what wraps this component (Card, Tabs, different page layouts)

