
# Complete Overhaul: AI Chatbot Test Widget Rendering

## Problem

The purple widget header keeps getting clipped because the test preview reuses production CSS classes (`.noddi-widget-panel`, `.noddi-widget-content`, `.noddi-widget-chat`) that have conflicting styles like `position: fixed`, `max-height: calc(100vh - 120px)`, `min-height: 200px`, and `flex: 1`. CSS specificity battles between inline styles, scoped overrides, and `widget.css` make this fragile and unpredictable.

## Solution: Isolate the test preview from production widget CSS

Stop using production CSS classes on the wrapper/panel/content divs entirely. Instead, use plain inline styles and custom class names that don't conflict with `widget.css`. Only the internal AiChat component (which needs `.noddi-widget-chat`, `.noddi-chat-messages`, etc.) keeps the widget CSS classes.

### File: `src/components/admin/widget/WidgetTestMode.tsx`

Replace the entire widget preview section with a clean, self-contained layout:

1. **Remove the `<style>` override block entirely** -- no more fighting CSS specificity
2. **Replace `.noddi-widget-panel` with a plain div** using only inline styles:
   - `display: flex`, `flexDirection: column`, `height: 100%`, `overflow: hidden`
3. **Replace `.noddi-widget-content` with a plain div** using only inline styles:
   - `flex: 1`, `minHeight: 0`, `overflow: hidden`, `padding: 0`
4. **Keep the header div** with inline styles only (no `.noddi-widget-header` class):
   - Explicit `padding`, `color`, `display: flex`, `flexShrink: 0`
5. **Add a single scoped CSS override** for the AiChat internals only:
   - `.widget-test-preview .noddi-widget-chat { min-height: 0; height: 100%; display: flex; flex-direction: column; }`
   - `.widget-test-preview .noddi-chat-messages { min-height: 0; flex: 1; overflow-y: auto; }`

This way the outer shell (panel, header, content wrapper) is 100% inline-styled with no CSS class conflicts, and only the inner AiChat component keeps its needed class names with minimal overrides.

### Structure

```text
Preview container (border-dashed, h-full, overflow-hidden)
  Widget shell (inline: flex col, h-100%, overflow-hidden, border-radius, shadow)
    Header (inline: bg-color, padding, flex-shrink-0, color white)
      Title + TEST badge
    Content area (inline: flex-1, min-h-0, overflow-hidden)
      <AiChat /> (uses .noddi-widget-chat internally -- overridden via scoped CSS)
```

### Key Differences from Previous Attempts

- Previous: Used `.noddi-widget-panel`, `.noddi-widget-header`, `.noddi-widget-content` classes, then tried to override their CSS with `!important` rules
- New: Drops those classes on the outer shell entirely, uses only inline styles -- zero CSS conflicts possible

No changes to any other files. The AiChat component itself is untouched.
