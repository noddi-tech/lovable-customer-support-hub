

## Remove Top Border from Conversation Table

The `border rounded-lg` wrapper around the table adds a visible top border that creates a double-line effect against the toolbar's bottom border. Removing just the top border should make the transition from toolbar to table feel cleaner.

### Changes

**File: `src/components/dashboard/conversation-list/ConversationTable.tsx`**
- Line 69: Change `border rounded-lg` to `border-x border-b rounded-b-lg` (keeps side and bottom borders, removes top border and top rounding)

**File: `src/components/dashboard/conversation-list/VirtualizedConversationTable.tsx`**
- Line 156: Change `border-b bg-card` on the fixed header wrapper to `bg-card` (remove the top separator border of the header since the toolbar's bottom border already provides separation)

This is a minimal two-line change to test the visual effect.

