

## Fix: MentionTextarea Collapsing in Chat Note Mode

### Problem
When toggling to internal note mode, the text input collapses to a tiny size. This happens because `MentionTextarea` wraps the `<textarea>` in a `<div className="relative">`, but `flex-1` is applied to the inner textarea — the outer div doesn't participate in the flex layout, so it shrinks to fit content.

### Fix
Wrap the `MentionTextarea` in a `<div className="flex-1 min-w-0">` so the flex layout gives it the same space as the regular Textarea, and remove `flex-1` from the inner className (it's redundant there).

### Change

**`src/components/conversations/ChatReplyInput.tsx`** (lines 512-528):

```tsx
// Before:
{isInternalNote ? (
  <MentionTextarea
    className={cn(
      "flex-1 min-h-[80px] resize-none ...",
      ...
    )}
    ...
  />

// After:
{isInternalNote ? (
  <div className="flex-1 min-w-0">
    <MentionTextarea
      className={cn(
        "min-h-[80px] resize-none ...",
        ...
      )}
      ...
    />
  </div>
```

One file, one change. The build errors shown are `@swc/core` native binding failures (infrastructure issue, not caused by code changes).

