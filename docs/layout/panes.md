# Pane Layout Pattern

This document describes the standardized approach for implementing multi-pane layouts with independent scrolling areas.

## Overview

The pane layout pattern ensures each pane in a multi-pane interface (2-pane, 3-pane, etc.) manages its own scrolling instead of relying on page-level scrolling. This creates a more app-like user experience.

## Height Chain Diagram

```
Page Wrapper (h-full min-h-0 overflow-hidden)
│
├── Toolbar (shrink-0) [optional]
│
└── Grid Container (h-full min-h-0)
    │
    ├── Pane 1 (min-h-0 min-w-0)
    │   ├── Pane Header (shrink-0) [optional]
    │   └── Pane Scroll (h-full w-full)
    │
    ├── Pane 2 (min-h-0 min-w-0)
    │   ├── Pane Header (shrink-0) [optional]
    │   └── Pane Scroll (h-full w-full)
    │
    └── Pane 3 (min-h-0 min-w-0)
        ├── Pane Header (shrink-0) [optional]
        └── Pane Scroll (h-full w-full)
```

## Key Components

### PaneColumn
Wrapper for a pane in a multi-pane layout. Ensures proper height constraints for nested scrolling.

```tsx
import { PaneColumn } from '@/components/layout/Pane';

<PaneColumn className="border-r border-border bg-card">
  {/* pane content */}
</PaneColumn>
```

### PaneHeader
Header section for a pane that doesn't participate in scrolling. Use for toolbars, titles, and other fixed content.

```tsx
import { PaneHeader } from '@/components/layout/Pane';

<PaneHeader>
  <div className="p-4 border-b">
    <h2>Pane Title</h2>
  </div>
</PaneHeader>
```

### PaneScroll
Scrollable content area for a pane. Uses shadcn ScrollArea with proper height constraints.

```tsx
import { PaneScroll } from '@/components/layout/Pane';

<PaneScroll>
  {/* scrollable content */}
</PaneScroll>
```

## Complete Example

```tsx
// Page wrapper
<div className="h-full min-h-0 overflow-hidden">
  {/* Optional toolbar */}
  <div className="shrink-0 border-b border-border bg-background">
    {toolbar}
  </div>

  {/* Three-pane grid */}
  <div className="grid h-full min-h-0 w-full grid-cols-[280px_1fr_360px] gap-6">
    {/* Left pane */}
    <PaneColumn className="border-r border-border bg-card">
      <PaneHeader>
        <div className="p-4 border-b">
          <h2>Blocks</h2>
        </div>
      </PaneHeader>
      <PaneScroll>
        <div className="p-4">
          {/* scrollable content */}
        </div>
      </PaneScroll>
    </PaneColumn>

    {/* Center pane */}
    <PaneColumn>
      <PaneScroll>
        {/* preview content */}
      </PaneScroll>
    </PaneColumn>

    {/* Right pane */}
    <PaneColumn className="border-l border-border bg-card">
      <PaneHeader>
        <div className="p-4 border-b">
          <h2>Properties</h2>
        </div>
      </PaneHeader>
      <PaneScroll>
        <div className="p-4">
          {/* scrollable content */}
        </div>
      </PaneScroll>
    </PaneColumn>
  </div>
</div>
```

## Do's and Don'ts

### ✅ DO

- Use `h-full min-h-0 overflow-hidden` on the page wrapper
- Use `h-full min-h-0` on the grid container
- Use `min-h-0 min-w-0` on pane wrappers
- Use `shrink-0` on toolbars and headers inside panes
- Use `PaneColumn`, `PaneHeader`, and `PaneScroll` utilities
- Use `ScrollArea` for scrollable content with `h-full w-full`

### ❌ DON'T

- Use `overflow-auto` or `overflow-y-auto` on pane ancestors
- Forget `min-h-0` on any container in the height chain
- Put padding on the grid container (use internal spacing instead)
- Use fixed heights instead of flexible height constraints
- Allow page-level scrolling to compete with pane scrolling

## Common Issues

### Page Still Scrolls
- Check that page wrapper has `overflow-hidden`
- Verify grid container has `h-full min-h-0`
- Ensure no ancestor has `overflow-auto`

### Pane Not Scrolling
- Verify pane wrapper has `min-h-0 min-w-0`
- Check that ScrollArea has `h-full w-full`
- Ensure content has enough height to trigger scrolling

### Layout Breaks
- All containers in the height chain need proper constraints
- Headers and toolbars inside panes need `shrink-0`
- Use `min-w-0` to prevent content from forcing overflow

## Responsive Considerations

For mobile and tablet breakpoints:
- Mobile: Single pane with drawer overlays
- Tablet: Two panes with left pane as drawer
- Desktop: Full three panes

Each breakpoint should maintain the same height chain principles with appropriate responsive grid columns.

## Testing

Use the guard test pattern to ensure proper structure:

```tsx
test("pane layout has proper structure", () => {
  render(<div className="h-[900px]"><YourComponent /></div>);
  const grid = screen.getByTestId("your-grid");
  expect(grid).toBeTruthy();
  expect(grid.childElementCount).toBe(3); // for 3-pane
});
```

## Linting

Use `scripts/lint-pane-scroll.ts` to catch common violations:

```bash
npm run lint:panes
```

This will flag:
- Grid containers missing `h-full` or `min-h-0`
- Pane wrappers missing proper constraints
- Competing `overflow-auto` usage