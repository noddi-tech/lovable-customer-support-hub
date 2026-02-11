

# Fix Widget Test Mode UI Issues

## Problem 1: No horizontal padding on chat messages
The `.noddi-chat-messages` class in `src/widget/styles/widget.css` (line 701) has `padding: 4px 0`, meaning zero left/right padding. Messages touch the edges.

**Fix**: Change to `padding: 4px 5px` to add horizontal padding.

## Problem 2: Widget overlaps action buttons
The widget preview container uses `position: relative` inline, but the `.noddi-widget-panel` CSS class has `position: fixed` (line 48), which causes the widget to float over the page and block "End Test" / "Clear Session" buttons.

**Fix in `WidgetTestMode.tsx`**:
- Move the widget preview area below the action buttons row (it already is in the grid, but the panel escapes due to `position: fixed`)
- The inline `style` on the `.noddi-widget-panel` div already sets `position: relative`, which should override the CSS. However, the CSS `position: fixed` has the same specificity, so we need to ensure the inline style wins. We should verify and also ensure the widget container doesn't have `z-index` issues.
- Add `z-index: 0` or `position: relative` with `overflow: hidden` on the dashed border container so the widget stays contained within the card.

## Files Changed

| File | Change |
|------|--------|
| `src/widget/styles/widget.css` | Line 701: change `padding: 4px 0` to `padding: 4px 5px` |
| `src/components/admin/widget/WidgetTestMode.tsx` | Add `overflow: hidden` or `z-index: 0` to the dashed-border preview container, and ensure the widget panel wrapper doesn't escape its bounds |

## Technical Details

1. **widget.css line 701**: `padding: 4px 0` becomes `padding: 4px 5px`
2. **WidgetTestMode.tsx line 120**: Add `overflow-hidden relative z-0` classes to the dashed border container to contain the widget within the card area, preventing it from overlapping the buttons above

