

# Fix: Enlarge Widget Test Preview and Align to Bottom

## Problem

The widget test preview container is too small (`maxHeight: 560px`, `min-h-[620px]`) and the chat content gets cropped at the top. The widget panel needs to be taller and properly bottom-aligned within its container.

## Changes

**File: `src/components/admin/widget/WidgetTestMode.tsx`**

1. **Increase outer container height**: Change `min-h-[620px]` to `min-h-[750px]` on the dashed border wrapper (line 120)
2. **Increase widget panel max height**: Change both `maxHeight: '560px'` values (lines 124 and 133) to `700px`
3. **Ensure bottom alignment**: The outer div already has `items-end` which anchors content to the bottom -- this stays. The widget container itself needs `height: 100%` instead of relying only on `maxHeight` so it fills the space and the AiChat scrolls internally

### Specific line changes:

- **Line 120**: `min-h-[620px]` -> `min-h-[750px]`
- **Line 124**: `maxHeight: '560px'` -> `maxHeight: '700px'`
- **Line 133**: `maxHeight: '560px'` -> `maxHeight: '700px'`

This gives the chat significantly more vertical space while keeping it contained and bottom-aligned.

