
## Add More Padding to Compact Toolbar Buttons

The text size and overall density are good now, but buttons need more horizontal and vertical padding to breathe properly -- matching closer to the reference screenshots.

### Change

**File: `src/components/ui/button.tsx`** (line 24)

Update the `xxs` size variant from:
- `h-5 px-1.5 text-[10px]`

To:
- `h-7 px-3 text-[10px]`

This increases:
- Height from 20px to 28px (matching `sm` height, giving vertical breathing room)
- Horizontal padding from 6px to 12px (proper spacing around icon + text)
- Text size stays at `10px` as you liked

### Why this works
- The reference buttons use `h-9 px-4` with `text-sm` -- proportionally our `h-7 px-3` with `text-[10px]` achieves a similar padded-but-compact feel.
- No other files need changing since all toolbar buttons already use `size="xxs"`.

### Files affected
- `src/components/ui/button.tsx` (1 line change)
