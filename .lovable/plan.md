

# Fix: Widget `open`/`close`/`toggle` Commands Not Working

## Root Cause

The hardcoded widget bundle's global API only handles the `init` command. When your code calls `noddi('open')`, it logs "API called: open undefined" but does nothing because there is no handler for `open`, `close`, or `toggle`.

Two places need fixing in `supabase/functions/deploy-widget/index.ts`:

## Changes

### 1. Add `open`/`close`/`toggle` to the API handler (line 1079-1082)

Current code only handles `init`:
```javascript
const api = function(cmd, opts) {
  console.log('[Noddi] API called:', cmd, opts);
  if (cmd === 'init') init(opts);
};
```

Updated to handle all commands:
```javascript
const api = function(cmd, opts) {
  console.log('[Noddi] API called:', cmd, opts);
  if (cmd === 'init') init(opts);
  else if (cmd === 'open') { state.isOpen = true; render(); }
  else if (cmd === 'close') { state.isOpen = false; render(); }
  else if (cmd === 'toggle') { state.isOpen = !state.isOpen; render(); }
};
```

### 2. Add `open`/`close`/`toggle` to queue processing (line 1071-1076)

Current queue processing only handles `init`:
```javascript
q.forEach(args => {
  console.log('[Noddi] Processing command:', args[0], args[1]);
  if (args[0] === 'init') init(args[1]);
});
```

Updated to handle all queued commands:
```javascript
q.forEach(args => {
  console.log('[Noddi] Processing command:', args[0], args[1]);
  api(args[0], args[1]);
});
```

### 3. Add named methods to the API object (after line 1083)

Add convenience methods so `NoddiWidget.open()` etc. also work:
```javascript
api.open = function() { state.isOpen = true; render(); };
api.close = function() { state.isOpen = false; render(); };
api.toggle = function() { state.isOpen = !state.isOpen; render(); };
```

## After Code Change

The Edge Function deploys automatically. Then click **"Deploy to Production"** once more in Admin > Widget to push the updated bundle to Supabase Storage.

## Summary

| Area | What |
|---|---|
| File | `supabase/functions/deploy-widget/index.ts` |
| Changes | 3 small edits adding open/close/toggle command handling |
| Root cause | API handler only recognized `init`, silently ignored all other commands |

