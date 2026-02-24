

## Add Section Labels and Bottom Margin to Toolbar

Add descriptive labels above the two button groups and balance the vertical padding.

### Changes

**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**

1. **Add bottom padding**: Change the outer container from `py-1` to `py-1.5` (or `pb-1.5`) so the spacing below the buttons matches the top.

2. **Add "Quick actions" label** above the left button group: A small `text-[9px] text-muted-foreground uppercase tracking-wide` label reading "Quick actions".

3. **Add "Sort / Filtering" label** above the right button group: Same styling, text-aligned right, reading "Sort / Filtering".

4. **Layout restructure**: Wrap the current single-row `flex` in a small two-row structure:
   - **Row 1**: Two labels left-aligned and right-aligned (using `flex justify-between`)
   - **Row 2**: The existing button row (unchanged)

### Visual result

```text
Quick actions                              Sort / Filtering
[Select] [+New] [Merge] [Migrate] [Read]   [Filters v] [Latest v]
```

### Technical detail

The labels row adds roughly 14px of height. The `pb-1.5` adds 6px bottom margin to match the top, keeping the toolbar feeling balanced.

