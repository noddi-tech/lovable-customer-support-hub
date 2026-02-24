

## Remove Remaining Border Between Toolbar and Table

The visible border line between the toolbar and the table header comes from two sources:

1. **The toolbar's `border-b`** on line 80 of `ConversationListHeader.tsx` -- this draws a bottom border under the buttons
2. **The table header's `border-b-2`** on line 71 of `ConversationTable.tsx` -- this draws a thick border under the "Customer / Conversation" header row

Since the toolbar and table should flow seamlessly, we need to remove the toolbar's bottom border and rely only on the table header's bottom border to separate the header from the data rows.

### Changes

**File: `src/components/dashboard/conversation-list/ConversationListHeader.tsx`**
- Line 80: Remove `border-b border-border` from the outer container classes, changing it to just `flex-shrink-0 px-1.5 pt-1 pb-1.5 bg-card`

**File: `src/components/dashboard/conversation-list/ConversationTable.tsx`**
- Line 69: Remove `border-x border-b rounded-b-lg` from the wrapper div (change to just `flex-1 overflow-auto`) so there are no side/bottom borders creating visible edges
- Line 71: Keep the `border-b-2` on the `TableHeader` as the only separator between the column headers and the data rows

**File: `src/components/dashboard/conversation-list/VirtualizedConversationTable.tsx`**
- Line 158: Add `border-b` to the `TableHeader` so the virtualized table also has a clean separator between header and rows (matching the non-virtualized table)

This removes the double-line effect while keeping a single clean divider between column headers and table content.
