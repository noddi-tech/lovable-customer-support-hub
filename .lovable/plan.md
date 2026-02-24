
## Match Filter and Sort Controls to Button Sizes

The Filters dropdown and Sort select are currently `h-5 px-1.5` (20px tall, 6px padding) while all the action buttons use `size="xxs"` which is `h-7 px-3` (28px tall, 12px padding). This makes them visually mismatched.

### Changes

**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**

1. **Filters dropdown trigger** (line 166): Change the custom `<button>` classes from `h-5 px-1.5 text-[10px] gap-0.5` to `h-7 px-3 text-[10px] gap-1.5` to match `xxs` button sizing.

2. **Sort select trigger** (line 217): Change `SelectTrigger` classes from `h-5 text-[10px] gap-0.5 px-1.5` to `h-7 text-[10px] gap-1.5 px-3`.

3. **Gap between filter/sort** (line 162): Increase gap from `gap-0.5` to `gap-1` to match the left-side button spacing.

### Result
All controls in the toolbar row will be the same height (28px) with consistent padding, creating a uniform look across the entire header bar.
