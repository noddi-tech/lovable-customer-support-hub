

# Fix: Wrap AiChat in `.noddi-widget-content` Container

## Problem

The AiChat component in the test mode is rendered directly inside the panel without the `.noddi-widget-content` wrapper div. In the production widget (WidgetPanel.tsx), AiChat sits inside a `<div className="noddi-widget-content">` which has `flex: 1; overflow-y: auto` -- this constrains the chat to fill available space and scroll internally. Without this wrapper, the chat area just keeps growing with each message.

## Solution

Wrap the `<AiChat>` component in a `<div className="noddi-widget-content">` element, matching the production widget structure. This single change gives the chat the same scroll-constrained behavior as the contact form and other views.

## Changes

**File: `src/components/admin/widget/WidgetTestMode.tsx`** (line ~153-165)

Wrap the `<AiChat ... />` component in a content div:

```tsx
{/* Before */}
<AiChat
  widgetKey={config.widget_key}
  ...
/>

{/* After */}
<div className="noddi-widget-content" style={{ padding: 0 }}>
  <AiChat
    widgetKey={config.widget_key}
    ...
  />
</div>
```

The `padding: 0` override is needed because `.noddi-widget-content` has `padding: 16px` by default, but AiChat handles its own internal padding. This matches how the production WidgetPanel renders it.

This is the same pattern the production widget uses and will give the test mode identical scroll behavior.
