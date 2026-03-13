

## Fix: Restore Full-Width Layout with Vertical Centering

The `flex items-center` on the outer card div (line 320) is causing the inner content to not stretch to full width — flex children default to their intrinsic width, not full width.

### Change

**`src/components/conversations/MessageCard.tsx`**:

- **Line 320**: Remove `flex items-center` from the outer div. Instead, use CSS grid for vertical centering which preserves full-width children:
  - Change: `effectiveCollapsed ? "py-1 min-h-[108px] flex items-center" : "py-2"`
  - To: `effectiveCollapsed ? "py-1 min-h-[108px] grid place-content-center" : "py-2"`

- **Line 329**: Remove the `w-full` workaround since grid children stretch by default:
  - Change: `effectiveCollapsed ? "py-0 w-full" : "py-4"`
  - To: `effectiveCollapsed ? "py-0" : "py-4"`

Using `grid place-content-center` vertically centers while keeping children at full width, unlike `flex items-center` which shrinks children horizontally.

