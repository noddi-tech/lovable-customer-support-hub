

# Fix: App Crash on "Fetch & Download" When No Gmail OAuth Account

## Problem
The "Fetch & Download" button correctly handles the 400 error (shows toast), but the Lovable dev error overlay also fires, showing "The app encountered an error." This is because the HTTP 400 response triggers the preview's error reporting system independently of the try/catch handling.

## Fix

**File: `src/components/ui/email-render.tsx`** (~lines 101-146)

Two changes:

1. **Suppress the `console.error` for handled cases**: The catch block at line 163 logs `console.error('Download error:', error)` which triggers the error overlay. But since the `recoverable === false` case returns at line 138 before reaching catch, this shouldn't be the issue. The more likely cause is that `response.json()` at line 130 parses fine, but the error is also being reported by the Lovable preview's network error interceptor.

2. **Better approach — don't attempt fetch if we know it will fail**: Instead of calling the edge function and getting a 400, show the "unavailable" toast immediately when the user clicks. We can still offer the fetch attempt, but wrap it more defensively:

```typescript
if (!response.ok) {
  const errData = await response.json().catch(() => ({}));
  if (errData.recoverable === false) {
    toast({ 
      title: "Attachment unavailable", 
      description: errData.error || "This file can't be fetched on-demand.",
      variant: "destructive",
      duration: 8000,
    });
    setIsDownloading(false);
    return; // Prevent any further error propagation
  }
  throw new Error(errData.error || `Failed to fetch attachment (${response.status})`);
}
```

3. **Add `edge function` to the `shouldSuppressError` list** in `GlobalErrorBoundary.tsx` to prevent the error overlay from showing for handled edge function errors. Add `message.includes('edge function')` to the suppression list.

**File: `src/components/error/GlobalErrorBoundary.tsx`** (~line 47-52)
- Add `message.includes('edge function')` to the network error suppression block

This ensures:
- The toast still shows with a clear explanation
- The app doesn't show the crash overlay
- No blank screen

