
# Fix: Loading State Ignores `position` Argument

## Problem

When the widget panel opens before the config has loaded, the position is calculated at line 421:
```
const pos = config?.position === 'bottom-right' ? 'right:20px' : 'left:20px';
```

Since `config` is `null` during loading, this always evaluates to `left:20px`, regardless of the `position` passed in the init options.

## Fix

**File: `supabase/functions/deploy-widget/index.ts`**

### 1. Store `position` from init options (around line 1021)

Add a module-level variable and capture it during init:

```javascript
let initPosition = null; // add near showButton declaration

// Inside init():
initPosition = options.position || null;
```

### 2. Use `initPosition` as fallback in the render function (line 421)

Update the position calculation to fall back to the init option when config is not yet loaded:

```javascript
const pos = (config?.position || initPosition) === 'bottom-right' ? 'right:20px' : 'left:20px';
```

This single expression checks `config.position` first (once loaded), then falls back to the `initPosition` passed during init.

## Summary

Two small edits in one file. The loading spinner will now appear on the correct side immediately. After the code change, click **"Deploy to Production"** in Admin > Widget to update the live bundle.
