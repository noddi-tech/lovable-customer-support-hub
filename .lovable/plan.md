
# Fix: Programmatic Widget Control (open/close without button)

## The Problem

When using `showButton: false` and calling `noddi('open')` after `noddi('init', ...)`, the open command fails because:

1. `init` triggers React rendering + an async config fetch
2. `open` runs immediately after, but `widgetAPI` is still `null` (React hasn't mounted yet)
3. Result: "Cannot open widget - not initialized yet" warning, nothing happens

This makes it impossible to use the widget without the floating button.

## The Fix

**File: `src/widget/index.tsx`**

Add a "pending commands" queue that buffers any commands (open/close/toggle) received before the widget API is ready, then automatically flushes them once `onMount` fires.

Changes:
- Add a `pendingCommands` array that collects commands while `widgetAPI` is null
- In `openWidget`, `closeWidget`, `toggleWidget`: instead of just warning, push to the pending queue
- In the `onMount` callback (line 67-69): after setting `widgetAPI`, flush all pending commands
- Add an `onReady` callback option so host apps can know when programmatic control is available

**File: `src/widget/types.ts`**

- Add `onReady?: () => void` to `WidgetInitOptions` for an optional callback when the widget is fully initialized

## What This Enables

```html
<!-- No button, open on page load -->
<script>
  noddi('init', { widgetKey: 'abc', showButton: false });
  noddi('open'); // will be queued and executed once widget is ready
</script>

<!-- Or with a custom button -->
<button onclick="noddi('toggle')">Chat with us</button>
```

## Technical Details

```
Timeline (current - broken):
init() → render starts → open() → widgetAPI is null → FAILS
                        ↓
              config fetch completes → onMount fires → widgetAPI set (too late)

Timeline (fixed):
init() → render starts → open() → queued as pending
                        ↓
              config fetch completes → onMount fires → widgetAPI set → flush pending → OPENS
```

### Specific code changes:

**`src/widget/index.tsx`**:
- Line 9: Add `let pendingCommands: Array<() => void> = [];`
- Lines 78-85 (`openWidget`): Change the `else` branch from `console.warn` to `pendingCommands.push(() => widgetAPI!.setIsOpen(true))`
- Lines 87-94 (`closeWidget`): Same pattern for close
- Lines 96-103 (`toggleWidget`): Same pattern for toggle
- Lines 67-69 (`onMount` callback): After setting `widgetAPI`, add a flush loop:
  ```
  pendingCommands.forEach(cmd => cmd());
  pendingCommands = [];
  ```

**`src/widget/types.ts`**:
- Add optional `onReady?: () => void` to `WidgetInitOptions`

**`src/widget/Widget.tsx`**:
- Pass `options.onReady` into the `onMount` effect so it fires after API is ready

This is a small, focused change (roughly 15 lines modified) that makes the buttonless use case work reliably.
