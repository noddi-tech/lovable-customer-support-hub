

# Fix Widget Header Clipping and Input Spacing

## Problem 1: Header clipped at top
The `overflow-hidden` we added to the dashed container clips the top of the widget header. The widget panel fills the container but the header gets cut off.

**Fix in `WidgetTestMode.tsx`**:
- Change `overflow-hidden` to `overflow-auto` on the dashed container (line 120), so the widget is still contained but scrollable if needed
- Alternatively, better: change the container from `items-center justify-center` to `items-start justify-center pt-2` so the widget starts from the top and the header isn't clipped

## Problem 2: Input area spacing
The `.noddi-chat-input-container` has `padding-top: 12px` and `margin-top: 12px` creating a large gap. Combined with no bottom padding on the chat view wrapper, the input looks disconnected.

**Fix in `widget.css`**:
- Reduce `.noddi-chat-input-container` padding-top from `12px` to `8px` and margin-top from `12px` to `8px`
- Add `padding-bottom: 8px` to the chat input container for proper bottom breathing room

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/widget/WidgetTestMode.tsx` | Line 120: change `overflow-hidden` to `overflow-visible`, remove `items-center`, add `items-start` so widget renders from top without clipping |
| `src/widget/styles/widget.css` | Lines 805-807: reduce input container spacing from 12px to 8px for padding-top and margin-top, add padding-bottom: 8px |

