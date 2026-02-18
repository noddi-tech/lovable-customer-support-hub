

# Fix: Widget Ignores `showButton: false`

## Problem

Your embed code correctly passes `showButton: false`, but the deployed widget bundle (hardcoded JS in the Edge Function) has no code to read or use that option. The floating button always renders.

## Changes

**File: `supabase/functions/deploy-widget/index.ts`**

### 1. Add a module-level variable (near line 1008)

Add `let showButton = true;` alongside the existing state variables.

### 2. Capture the option during init (line 1010-1017)

Inside the `init()` function, after validating `widgetKey`, store the option:

```
showButton = options.showButton !== false;
```

### 3. Conditionally render the button (lines 651-656)

Wrap the floating button HTML in a check:

```
if (showButton) {
  const btnPos = ...;
  const btnColor = ...;
  html += '<button ...>';
  html += state.isOpen ? icons.close : icons.chat;
  html += '</button>';
}
```

## After Code Change

Since this is an Edge Function, it deploys automatically. Then click **"Deploy to Production"** once more in Admin > Widget to push the updated bundle to Supabase Storage.

## Summary

3 small edits in one file. No new dependencies. Your existing embed code will work as-is once deployed.

