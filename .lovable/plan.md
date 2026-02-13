

# Bulletproof Fix: Widget Test Mode Height

## Root Cause

The outer `div.space-y-6` wrapper has no height constraint. Inside it, the grid preview uses `h-[calc(100vh-200px)]` which is too tall -- it doesn't account for the page header, navigation tabs, the Alert box, or the button bar above it. All that content adds up to ~350-400px, so the preview overflows the viewport and pushes the page header off-screen.

## Solution

Replace the current layout with a proper flex column that fills available space, letting the grid stretch into remaining room instead of guessing a `calc()` value.

### File: `src/components/admin/widget/WidgetTestMode.tsx`

**Change 1 -- Outer wrapper (line 77):**
Change from `space-y-6` to a flex column with constrained height:
```tsx
// Before
<div className="space-y-6">

// After  
<div className="flex flex-col gap-4 h-[calc(100vh-180px)] overflow-hidden">
```
This caps the entire component to the viewport minus the page header/tabs (~180px).

**Change 2 -- Grid container (line 118):**
Make the grid fill remaining space instead of having its own viewport-based height:
```tsx
// Before
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

// After
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
```

**Change 3 -- Preview container (line 120):**
Remove the `h-[calc(100vh-200px)]` and use `h-full` instead, since the parent now controls height:
```tsx
// Before
<div className="widget-test-preview ... h-[calc(100vh-200px)] overflow-hidden ...">

// After
<div className="widget-test-preview ... h-full overflow-hidden ...">
```

**Change 4 -- Alert and buttons (lines 78-116):**
Add `flex-shrink-0` to prevent the Alert and button bar from being compressed:
```tsx
<Alert className="flex-shrink-0">
  ...
</Alert>
<div className="flex items-center gap-4 flex-shrink-0">
  ...
</div>
```

## Why This Is Bulletproof

- The outer container is the single source of truth for height
- The Alert and buttons are fixed-size (`flex-shrink-0`)
- The grid takes all remaining space (`flex-1 min-h-0`)
- The preview fills its grid cell (`h-full`)
- No guessing pixel offsets in `calc()` -- flex layout handles it automatically
- The scoped CSS overrides already in place continue to zero out inner min-heights

