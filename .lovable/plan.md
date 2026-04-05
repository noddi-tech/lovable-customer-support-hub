

# Fix BCC Bulk Send — Prevent Dialog Close During Send Loop

## Problem

The `createConversationMutation.onSuccess` callback (line 286) unconditionally closes the dialog, resets the form, and navigates to the created conversation on every successful call. During BCC bulk send, `mutateAsync` is called in a loop for each email, so after the first email the dialog closes and navigates away — interrupting the remaining sends.

The progress bar UI is fully built (lines 854-868) but never visible because the dialog closes before the second email is processed.

## Fix

### `src/components/dashboard/NewConversationDialog.tsx`

**1. Add a ref to track bulk send state:**
```typescript
const bulkSendProgressRef = useRef(bulkSendProgress);
useEffect(() => { bulkSendProgressRef.current = bulkSendProgress; }, [bulkSendProgress]);
```

**2. Guard `onSuccess` (line 286):**
```typescript
onSuccess: (conversation) => {
  // Skip per-message handling during bulk send
  if (bulkSendProgressRef.current) return;

  toast.success('Conversation created successfully');
  // ... rest of existing close/navigate logic
},
```

**3. Guard `onError` (line 305):**
Same pattern — during bulk send, don't show individual error toasts or clear state. The bulk loop already tracks failures and shows a summary.

This is a one-file, ~10-line change. The bulk send handler (line 478-515) already manages progress, summary toast, dialog close, and navigation at the end of the loop — it just needs the per-call callbacks to stay out of the way.

## File to change

- `src/components/dashboard/NewConversationDialog.tsx`

