

# Improve SendGrid Retry UX with Progress Feedback

## Problem

After clicking "Verify DNS & Retry", the UI goes silent for up to 2 minutes while it retries creating the parse route in the background. The user sees "Creating parse route now..." toast but then nothing until it either succeeds or shows "Still pending".

## Changes

**File: `src/components/admin/SendgridSetupWizard.tsx`**

1. Add a `retryStatus` state variable (line ~24):
   ```
   const [retryStatus, setRetryStatus] = useState<string | null>(null);
   ```

2. In the parse route retry loop (lines 147-163), add progress updates before each attempt:
   ```
   setRetryStatus(`Creating parse route... attempt ${c}/6`);
   ```
   - Reduce from 12 attempts to 6 (60 seconds max instead of 2 minutes)

3. In the validation polling loop (lines 137-168), add progress updates:
   ```
   setRetryStatus(`Validating sender auth... attempt ${attempt}/12`);
   ```

4. Clear status in the `finally` block (line 176):
   ```
   setRetryStatus(null);
   ```

5. Add a progress indicator in the JSX near the buttons (after line ~220):
   ```jsx
   {retryStatus && (
     <p className="text-sm text-muted-foreground animate-pulse">{retryStatus}</p>
   )}
   ```

6. After retries exhaust, show an info banner instead of only a destructive toast -- indicating DNS is verified and the user just needs to wait and try again.

