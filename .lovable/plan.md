

## Add Padding Below Toolbar Before Data Table

Add 5px of bottom padding/margin to the toolbar container so there's a small visual gap between the buttons/filters row and the table header.

### Change

**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**
- Update the outer container's bottom padding from `pb-1.5` (6px) to `pb-[11px]` (~6px + 5px) -- or more simply, add `mb-[5px]` to create a 5px gap before the table starts.

Specifically, on the outer `<div>`, change `pb-1.5` to `pb-3` (12px total bottom padding, roughly 5-6px more than current) for a clean Tailwind value, or use `pb-[11px]` for exact 5px increase.

