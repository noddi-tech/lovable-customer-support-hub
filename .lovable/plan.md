
# Fix: Widget Header Being Clipped in AI Chatbot Test Mode

## Problem

In the AI Chatbot page (Admin > AI & Intelligence > AI Chatbot > Test tab), the widget's purple header bar ("AI Assistant" + TEST badge) is being clipped/cut off at the top of the preview container. Only the chat messages and input are visible.

## Root Cause

The widget panel uses `overflow: hidden` on the outer panel div. Inside, the `.noddi-widget-content` has `flex: 1` from the base CSS (`widget.css` line 129), which makes it try to take all available space. Combined with `.noddi-widget-chat` (`min-height: 350px`) and `.noddi-chat-messages` (`min-height: 200px`), the content area grows larger than the container. Since `overflow: hidden` clips at the panel level, the **header at the top gets pushed out of view** while the content area fills the visible space.

The existing CSS overrides in the `<style>` tag set `min-height: 0 !important` on several child elements, but they miss a critical override: forcing `.noddi-widget-content` to also have `overflow: hidden` so that content clips **within the content area** rather than at the panel level.

## Solution

### File: `src/components/admin/widget/WidgetTestMode.tsx`

**Change 1 -- Add overflow override to scoped CSS (line 124):**

Add `overflow: hidden !important` to the `.noddi-widget-content` override so it clips its own children instead of letting them push the header out:

```css
.widget-test-preview .noddi-widget-content { 
  min-height: 0 !important; 
  overflow: hidden !important; 
}
```

**Change 2 -- Add `.noddi-widget-chat` min-height override (existing line 122):**

The base CSS has `.noddi-widget-chat { min-height: 350px; }`. The current override sets `height: 100%` but should also be explicitly constrained:

```css
.widget-test-preview .noddi-widget-chat { 
  min-height: 0 !important; 
  height: 100% !important; 
  overflow: hidden !important; 
}
```

**Change 3 -- Ensure the header has `flex-shrink: 0` explicitly in inline style (line 148):**

Add `flexShrink: 0` to the widget header's inline style to guarantee it never gets compressed by the flex layout:

```tsx
<div
  className="noddi-widget-header"
  style={{ backgroundColor: config.primary_color, flexShrink: 0 }}
>
```

The CSS already has `flex-shrink: 0` on `.noddi-widget-header`, but adding it as inline style ensures it has the highest specificity and cannot be overridden.

## Summary

Three small additions in `WidgetTestMode.tsx`:
1. Add `overflow: hidden !important` to `.noddi-widget-content` CSS override
2. Add `overflow: hidden !important` to `.noddi-widget-chat` CSS override
3. Add `flexShrink: 0` inline style to the widget header div

This ensures the content area clips its own children internally, preventing them from pushing the header out of view.
