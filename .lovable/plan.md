

# Fix "+New" Button: Text Cursor and Consistent Styling

## Problem

The "+New" button is wrapped with `asChild` and renders as a `<span>` element (line 100-105). This causes:
1. **Text cursor on hover** instead of pointer cursor -- because `<span>` is not a button element
2. **Visual inconsistency** -- it uses `variant="default"` but the `asChild` + `<span>` pattern breaks the button behavior

## Fix

**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**

Replace lines 98-106:

```tsx
{/* New */}
<NewConversationDialog>
  <Button variant="default" size="sm" asChild>
    <span>
      <Plus className="!w-3.5 !h-3.5" />
      {t('dashboard.conversationList.new', 'New')}
    </span>
  </Button>
</NewConversationDialog>
```

With:

```tsx
{/* New */}
<NewConversationDialog>
  <Button variant="default" size="sm">
    <Plus className="!w-3.5 !h-3.5" />
    {t('dashboard.conversationList.new', 'New')}
  </Button>
</NewConversationDialog>
```

The key change: remove `asChild` and the inner `<span>` wrapper. The `NewConversationDialog` component likely uses a `DialogTrigger` internally that handles the click -- we just need to ensure the Button renders as a proper `<button>` element so cursor behavior is correct.

If `NewConversationDialog` requires `asChild` to work as a trigger, the fix is to use a `<button>` instead of `<span>`:

```tsx
<NewConversationDialog>
  <Button variant="default" size="sm" asChild>
    <button>
      <Plus className="!w-3.5 !h-3.5" />
      {t('dashboard.conversationList.new', 'New')}
    </button>
  </Button>
</NewConversationDialog>
```

This ensures the rendered element is a `<button>`, which natively shows a pointer cursor and behaves correctly.

## Summary

| What | Before | After |
|---|---|---|
| Rendered element | `<span>` | `<button>` |
| Cursor on hover | Text cursor | Pointer cursor |
| Visual style | Same (default/primary) | Same (default/primary) |
