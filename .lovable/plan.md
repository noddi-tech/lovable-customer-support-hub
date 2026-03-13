

## Center Content Vertically in Collapsed Message Cards

The collapsed cards have `min-h-[108px]` but content is top-aligned, leaving empty space at the bottom.

### Fix

**`src/components/conversations/MessageCard.tsx`**:

1. **Line 320**: Add `flex items-center` to the collapsed card so the inner content block is vertically centered within the 108px height:
   - Change: `effectiveCollapsed ? "py-1 min-h-[108px]" : "py-2"`
   - To: `effectiveCollapsed ? "py-1 min-h-[108px] flex items-center" : "py-2"`

2. **Line 328**: Ensure the inner `px-4` div takes full width when the parent is flex:
   - Add `w-full` to: `"px-4", effectiveCollapsed ? "py-0 w-full" : "py-4"`

This vertically centers the header + preview text block within the card without changing any other layout.

