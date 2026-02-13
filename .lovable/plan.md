

# Fix: Widget Chat Height Expanding Beyond Container

## Problem

The previous fixes only addressed `min-height` on the `.noddi-widget-content` wrapper, but two inner elements still have `min-height` values that force the widget to expand:

- `.noddi-widget-chat` has `min-height: 350px`
- `.noddi-chat-messages` has `min-height: 200px`

These prevent the flex layout from constraining the chat, causing it to push past the container and hide the page header.

## Solution

Add a scoped CSS override inside the test mode container that zeroes out these min-heights. This is cleaner than inline styles (which can't target nested children) and won't affect the production widget.

## Changes

**File: `src/components/admin/widget/WidgetTestMode.tsx`**

Add a `<style>` tag inside the test mode container that scopes overrides to the test preview only. Target the dashed border container and override the problematic min-heights:

```tsx
{/* Inside the border-2 border-dashed container, before the widget markup */}
<style>{`
  .widget-test-preview .noddi-widget-chat { min-height: 0; }
  .widget-test-preview .noddi-chat-messages { min-height: 0; }
  .widget-test-preview .noddi-widget-content { min-height: 0; }
`}</style>
```

Then add `widget-test-preview` class to the dashed border container div (line 120).

This scoped approach ensures:
- All nested min-height values are zeroed, allowing proper flex shrinking
- The production widget CSS is unaffected
- No need for complex inline style chains on deeply nested elements
